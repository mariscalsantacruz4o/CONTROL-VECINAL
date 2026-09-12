import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { auditLog, neighbors } from "../../../../db/schema";
import { allocatePayments, paymentNoteForStorage, receiptForPayment } from "../../../../lib/payment-ledger";
import { apiError, cleanText, moneyToCents, requireAdmin } from "../../_shared";

type ChargeRow = {
  activityId: number;
  amount: number;
  activityTitle: string;
  activityCode: string;
  activityDate: string;
  cardRowIndex: number;
};

type PaymentRow = { receipt: string; amount: number };

type CreatedPaymentRow = {
  id: number;
  neighborId: number;
  date: string;
  amountCents: number;
  note: string;
  receipt: string;
  createdAt: string;
};

export async function POST(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const neighborId = Number(body.neighborId);
    const amountCents = moneyToCents(body.amount);
    const date = cleanText(body.date, 10);
    const rawActivityId = body.activityId;
    const activityId = rawActivityId === undefined || rawActivityId === null || rawActivityId === "" ? null : Number(rawActivityId);
    const method = cleanText(body.method, 40) || "No especificado";
    const note = cleanText(body.note, 240);
    if (!neighborId || amountCents <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Vecino, fecha y monto son obligatorios" }, { status: 400 });
    }
    if (activityId !== null && (!Number.isSafeInteger(activityId) || activityId <= 0)) {
      return Response.json({ error: "El concepto de pago no es válido" }, { status: 400 });
    }

    await ensureDatabase();
    const db = getDb();
    const d1 = getD1();
    const [neighbor] = await db.select().from(neighbors).where(eq(neighbors.id, neighborId)).limit(1);
    if (!neighbor) return Response.json({ error: "Vecino no encontrado" }, { status: 404 });

    const [chargeResult, paymentResult] = await Promise.all([
      d1.prepare(`
        SELECT ar.activity_id AS activityId, ar.charge_cents AS amount,
               a.title AS activityTitle, a.code AS activityCode,
               a.date AS activityDate, a.card_row_index AS cardRowIndex
        FROM attendance_records ar
        INNER JOIN activities a ON a.id = ar.activity_id
        WHERE ar.neighbor_id = ? AND ar.charge_cents > 0
        ORDER BY ar.activity_id
      `).bind(neighborId).all<ChargeRow>(),
      d1.prepare(`
        SELECT receipt, amount_cents AS amount
        FROM payments
        WHERE neighbor_id = ?
        ORDER BY id
      `).bind(neighborId).all<PaymentRow>(),
    ]);
    const charges = chargeResult.results ?? [];
    const previousPayments = paymentResult.results ?? [];
    const allocations = allocatePayments(
      charges.map((charge) => ({ activityId: charge.activityId, amount: charge.amount, order: charge.activityId })),
      previousPayments,
    );
    const balanceCents = allocations.reduce((sum, allocation) => sum + allocation.balance, 0);
    if (balanceCents === 0) return Response.json({ error: "El vecino no tiene deuda pendiente" }, { status: 409 });

    if (activityId === null) {
      return Response.json({
        error: "Registre el resultado desde Control por vecino para asociar el pago a una actividad",
      }, { status: 409 });
    }

    const target = allocations.find((allocation) => allocation.activityId === activityId);
    const targetCharge = charges.find((charge) => charge.activityId === activityId);
    if (!target || !targetCharge || target.balance <= 0) {
      return Response.json({ error: "Ese concepto no tiene deuda pendiente para este vecino" }, { status: 409 });
    }
    if (amountCents < target.balance) {
      return Response.json({
        error: `No se permiten pagos parciales. El monto completo de este concepto es Bs ${(target.balance / 100).toFixed(2)}`,
      }, { status: 409 });
    }
    if (amountCents > target.balance) {
      return Response.json({ error: `El pago supera el saldo de ese concepto: Bs ${(target.balance / 100).toFixed(2)}` }, { status: 409 });
    }
    if (date < targetCharge.activityDate) {
      return Response.json({ error: "La fecha del pago no puede ser anterior al concepto cobrado" }, { status: 409 });
    }

    const storedNote = paymentNoteForStorage(method, note);
    const temporaryReceipt = `PENDING-${crypto.randomUUID()}-A${activityId}`;
    const created = await d1.prepare(`
      INSERT INTO payments (neighbor_id, date, amount_cents, note, receipt)
      SELECT ?, ?, ?, ?, ?
      WHERE ? = MAX(0,
        (SELECT charge_cents FROM attendance_records WHERE neighbor_id = ? AND activity_id = ?)
        - (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE neighbor_id = ? AND receipt LIKE ?)
        - ?
      )
      AND ? <= MAX(0,
        (SELECT COALESCE(SUM(charge_cents), 0) FROM attendance_records WHERE neighbor_id = ?)
        - (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE neighbor_id = ?)
      )
      RETURNING id, neighbor_id AS neighborId, date, amount_cents AS amountCents,
                note, receipt, created_at AS createdAt
    `).bind(
      neighborId, date, amountCents, storedNote, temporaryReceipt,
      amountCents, neighborId, activityId, neighborId, `%-A${activityId}`, target.legacyPaid,
      amountCents, neighborId, neighborId,
    ).first<CreatedPaymentRow>();
    if (!created) {
      return Response.json({ error: "El saldo cambió mientras guardábamos. Revíselo e intente nuevamente" }, { status: 409 });
    }

    const receipt = receiptForPayment(created.id, activityId);
    await d1.prepare("UPDATE payments SET receipt = ? WHERE id = ?").bind(receipt, created.id).run();
    await db.insert(auditLog).values({
      action: "create",
      entityType: "payment",
      entityId: String(created.id),
      actorEmail: access.identity ?? "",
      detailJson: JSON.stringify({ neighborId, amountCents, receipt, activityId, method }),
    });
    return Response.json({
      payment: {
        ...created,
        receipt,
        note,
        amount: created.amountCents / 100,
        activityId,
        activityTitle: targetCharge.activityTitle,
        activityCode: targetCharge.activityCode,
        cardRowIndex: targetCharge.cardRowIndex,
        method,
        allocationMethod: "exact",
      },
      balance: (balanceCents - amountCents) / 100,
      activityBalance: 0,
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
