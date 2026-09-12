import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { activities, neighbors } from "../../../../db/schema";
import { allocatePayments, paymentNoteForStorage } from "../../../../lib/payment-ledger";
import { apiError, cleanText, requireAdmin } from "../../_shared";

const allowedStatuses = new Set(["Presente", "Faltó", "Justificado"]);

type SubmittedRecord = {
  neighborId?: unknown;
  status?: unknown;
  note?: unknown;
  settled?: unknown;
};

type ChargeRow = { activityId: number; neighborId: number; amount: number };
type PaymentRow = { neighborId: number; receipt: string; amount: number };

function isContribution(rowIndex: number) {
  return rowIndex === 1 || rowIndex === 2;
}

export async function PUT(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as { activityId?: unknown; recordedDate?: unknown; records?: SubmittedRecord[] };
    const activityId = Number(body.activityId);
    const requestedDate = cleanText(body.recordedDate, 10);
    const recordedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : new Date().toISOString().slice(0, 10);
    if (!activityId || !Array.isArray(body.records)) {
      return Response.json({ error: "Lista de control inválida" }, { status: 400 });
    }

    await ensureDatabase();
    const db = getDb();
    const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
    if (!activity) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });

    const validNeighborIds = new Set(
      (await db.select({ id: neighbors.id }).from(neighbors).where(eq(neighbors.active, true))).map((neighbor) => neighbor.id),
    );
    const records = body.records.map((record) => ({
      neighborId: Number(record.neighborId),
      status: cleanText(record.status, 20),
      note: cleanText(record.note, 300),
      settled: record.settled === true,
    }));
    const submittedIds = new Set(records.map((record) => record.neighborId));
    if (
      submittedIds.size !== records.length
      || records.some((record) => !validNeighborIds.has(record.neighborId) || !allowedStatuses.has(record.status))
    ) {
      return Response.json({ error: "El control contiene un vecino repetido o un estado inválido" }, { status: 400 });
    }

    const contribution = isContribution(activity.cardRowIndex);
    const d1 = getD1();
    const [chargeResult, paymentResult] = await Promise.all([
      d1.prepare("SELECT activity_id AS activityId, neighbor_id AS neighborId, charge_cents AS amount FROM attendance_records WHERE charge_cents > 0 ORDER BY activity_id").all<ChargeRow>(),
      d1.prepare("SELECT neighbor_id AS neighborId, receipt, amount_cents AS amount FROM payments ORDER BY id").all<PaymentRow>(),
    ]);
    const chargeRows = chargeResult.results ?? [];
    const paymentRows = paymentResult.results ?? [];
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    let pendingCount = 0;
    let generatedCents = 0;
    let automaticPaymentCount = 0;
    let automaticPaymentCents = 0;

    for (const record of records) {
      const proposedCharge = contribution
        ? record.status === "Justificado" ? 0 : activity.amountCents
        : record.status === "Faltó" ? activity.amountCents : 0;
      const neighborChargesBefore = chargeRows
        .filter((row) => row.neighborId === record.neighborId)
        .map((row) => ({ activityId: row.activityId, amount: row.amount, order: row.activityId }));
      const neighborPayments = paymentRows
        .filter((row) => row.neighborId === record.neighborId)
        .map((row) => ({ receipt: row.receipt, amount: row.amount }));
      const previousAllocation = allocatePayments(neighborChargesBefore, neighborPayments)
        .find((allocation) => allocation.activityId === activityId);
      const exactPaid = neighborPayments
        .filter((payment) => payment.receipt.endsWith(`-A${activityId}`))
        .reduce((sum, payment) => sum + payment.amount, 0);
      const previouslyPaid = Math.max(previousAllocation?.paid ?? 0, exactPaid);
      const requestedSettlement = record.settled || (contribution && record.status === "Presente");
      if (previouslyPaid > proposedCharge) {
        return Response.json({
          error: "No se puede marcar como exento o sin cargo porque este registro ya tiene dinero recibido. Mantenga Pagó o Regularizó para proteger el historial.",
        }, { status: 409 });
      }
      if (previouslyPaid > 0 && record.status === "Faltó" && !requestedSettlement) {
        return Response.json({
          error: "Este registro ya tiene dinero recibido. No puede volver a No pagó o Pendiente; mantenga Pagó o Regularizó para proteger el historial.",
        }, { status: 409 });
      }

      const proposedCharges = [
        ...neighborChargesBefore.filter((charge) => charge.activityId !== activityId),
        ...(proposedCharge > 0 ? [{ activityId, amount: proposedCharge, order: activityId }] : []),
      ];
      const targetAllocation = allocatePayments(proposedCharges, neighborPayments)
        .find((allocation) => allocation.activityId === activityId);
      const shouldSettle = proposedCharge > 0 && requestedSettlement;
      const remaining = targetAllocation?.balance ?? proposedCharge;

      statements.push(d1.prepare(`
        INSERT INTO attendance_records (activity_id, neighbor_id, status, charge_cents, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(activity_id, neighbor_id) DO UPDATE SET
          status = excluded.status,
          charge_cents = excluded.charge_cents,
          note = excluded.note,
          updated_at = excluded.updated_at
      `).bind(activityId, record.neighborId, record.status, proposedCharge, record.note, now, now));

      if (shouldSettle && remaining > 0) {
        const receipt = `AUTO-${crypto.randomUUID().slice(0, 12).toUpperCase()}-A${activityId}`;
        const storedNote = paymentNoteForStorage("Registro automático", contribution ? "Pago total confirmado en control" : "Regularización total confirmada en control");
        statements.push(d1.prepare(`
          INSERT INTO payments (neighbor_id, date, amount_cents, note, receipt)
          SELECT ?, ?, ?, ?, ?
          WHERE ? <= MAX(0,
            (SELECT COALESCE(SUM(charge_cents), 0) FROM attendance_records WHERE neighbor_id = ?)
            - (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE neighbor_id = ?)
          )
          AND ? <= MAX(0,
            (SELECT charge_cents FROM attendance_records WHERE neighbor_id = ? AND activity_id = ?)
            - (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE neighbor_id = ? AND receipt LIKE ?)
            - ?
          )
        `).bind(
          record.neighborId, recordedDate, remaining, storedNote, receipt,
          remaining, record.neighborId, record.neighborId,
          remaining, record.neighborId, activityId, record.neighborId, `%-A${activityId}`, targetAllocation?.legacyPaid ?? 0,
        ));
        automaticPaymentCount += 1;
        automaticPaymentCents += remaining;
      }

      const pending = proposedCharge > 0 && !shouldSettle && remaining > 0;
      if (pending) pendingCount += 1;
      generatedCents += proposedCharge;
    }

    statements.push(d1.prepare("UPDATE activities SET status = 'Cerrada', updated_at = ? WHERE id = ?").bind(now, activityId));
    statements.push(d1.prepare("INSERT INTO audit_log (action, entity_type, entity_id, actor_email, detail_json) VALUES (?, ?, ?, ?, ?)").bind(
      "save",
      "attendance",
      String(activityId),
      access.identity ?? "",
      JSON.stringify({ records: records.length, pendingCount, automaticPaymentCount, automaticPaymentCents }),
    ));
    await d1.batch(statements);

    return Response.json({
      ok: true,
      absentCount: pendingCount,
      pendingCount,
      generated: generatedCents / 100,
      paidCount: automaticPaymentCount,
      paid: automaticPaymentCents / 100,
    });
  } catch (error) { return apiError(error); }
}
