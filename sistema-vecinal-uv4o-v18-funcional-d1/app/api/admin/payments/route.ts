import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { auditLog, neighbors, payments } from "../../../../db/schema";
import { apiError, cleanText, moneyToCents, requireAdmin } from "../../_shared";

export async function POST(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const neighborId = Number(body.neighborId);
    const amountCents = moneyToCents(body.amount);
    const date = cleanText(body.date, 10);
    if (!neighborId || amountCents <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Vecino, fecha y monto son obligatorios" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const [neighbor] = await db.select().from(neighbors).where(eq(neighbors.id, neighborId)).limit(1);
    if (!neighbor) return Response.json({ error: "Vecino no encontrado" }, { status: 404 });
    const totals = await getD1().prepare(`
      SELECT
        COALESCE((SELECT SUM(charge_cents) FROM attendance_records WHERE neighbor_id = ?), 0) AS generated,
        COALESCE((SELECT SUM(amount_cents) FROM payments WHERE neighbor_id = ?), 0) AS paid
    `).bind(neighborId, neighborId).first<{ generated: number; paid: number }>();
    const balanceCents = Math.max(0, Number(totals?.generated ?? 0) - Number(totals?.paid ?? 0));
    if (balanceCents === 0) return Response.json({ error: "El vecino no tiene deuda pendiente" }, { status: 409 });
    if (amountCents > balanceCents) return Response.json({ error: `El pago supera el saldo pendiente de Bs ${(balanceCents / 100).toFixed(2)}` }, { status: 409 });
    const temporaryReceipt = `PENDING-${crypto.randomUUID()}`;
    const [created] = await db.insert(payments).values({ neighborId, date, amountCents, note: cleanText(body.note, 300), receipt: temporaryReceipt }).returning();
    const receipt = `REC-${String(created.id).padStart(5, "0")}`;
    const [payment] = await db.update(payments).set({ receipt }).where(eq(payments.id, created.id)).returning();
    await db.insert(auditLog).values({ action: "create", entityType: "payment", entityId: String(payment.id), actorEmail: access.identity ?? "", detailJson: JSON.stringify({ neighborId, amountCents, receipt }) });
    return Response.json({ payment: { ...payment, amount: payment.amountCents / 100 }, balance: (balanceCents - amountCents) / 100 }, { status: 201 });
  } catch (error) { return apiError(error); }
}
