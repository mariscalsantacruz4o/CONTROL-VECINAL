import { asc, desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { activities, attendanceRecords, neighbors, notices, payments, systemSettings } from "../../../../db/schema";
import { activityIdFromReceipt, allocatePayments, readStoredPaymentNote } from "../../../../lib/payment-ledger";
import { apiError, centsToMoney, requireAdmin } from "../../_shared";

function parseJson(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return {}; }
}

export async function GET(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    await ensureDatabase();
    const db = getDb();
    const [neighborRows, activityRows, attendanceRows, paymentRows, noticeRows, settingRows] = await Promise.all([
      db.select().from(neighbors).orderBy(asc(neighbors.name)),
      db.select().from(activities).orderBy(desc(activities.date), desc(activities.id)),
      db.select().from(attendanceRecords),
      db.select().from(payments).orderBy(desc(payments.date), desc(payments.id)),
      db.select().from(notices).limit(1),
      db.select().from(systemSettings).limit(1),
    ]);
    const generatedByNeighbor = new Map<number, number>();
    const paidByNeighbor = new Map<number, number>();
    const allocationByCharge = new Map<string, ReturnType<typeof allocatePayments>[number]>();
    const accountByNeighbor = new Map<number, { allocated: number; unallocated: number; balance: number }>();
    const activityById = new Map(activityRows.map((activity) => [activity.id, activity]));
    for (const record of attendanceRows) generatedByNeighbor.set(record.neighborId, (generatedByNeighbor.get(record.neighborId) ?? 0) + record.chargeCents);
    for (const payment of paymentRows) paidByNeighbor.set(payment.neighborId, (paidByNeighbor.get(payment.neighborId) ?? 0) + payment.amountCents);
    for (const neighbor of neighborRows) {
      const neighborCharges = attendanceRows.filter((record) => record.neighborId === neighbor.id && record.chargeCents > 0);
      const neighborPayments = paymentRows.filter((payment) => payment.neighborId === neighbor.id);
      const allocations = allocatePayments(
        neighborCharges.map((record) => ({ activityId: record.activityId, amount: record.chargeCents, order: record.activityId })),
        neighborPayments.map((payment) => ({ receipt: payment.receipt, amount: payment.amountCents })),
      );
      for (const allocation of allocations) allocationByCharge.set(`${neighbor.id}:${allocation.activityId}`, allocation);
      const allocated = allocations.reduce((sum, allocation) => sum + allocation.paid, 0);
      const balance = allocations.reduce((sum, allocation) => sum + allocation.balance, 0);
      accountByNeighbor.set(neighbor.id, {
        allocated,
        balance,
        unallocated: Math.max(0, (paidByNeighbor.get(neighbor.id) ?? 0) - allocated),
      });
    }
    return Response.json({
      neighbors: neighborRows.map((neighbor) => ({
        ...neighbor,
        generated: centsToMoney(generatedByNeighbor.get(neighbor.id) ?? 0),
        paid: centsToMoney(paidByNeighbor.get(neighbor.id) ?? 0),
        allocated: centsToMoney(accountByNeighbor.get(neighbor.id)?.allocated ?? 0),
        unallocated: centsToMoney(accountByNeighbor.get(neighbor.id)?.unallocated ?? 0),
        balance: centsToMoney(accountByNeighbor.get(neighbor.id)?.balance ?? 0),
      })),
      activities: activityRows.map((activity) => ({ ...activity, fine: centsToMoney(activity.amountCents) })),
      attendance: attendanceRows.map((record) => {
        const allocation = allocationByCharge.get(`${record.neighborId}:${record.activityId}`);
        const paidCents = allocation?.paid ?? 0;
        const balanceCents = allocation?.balance ?? record.chargeCents;
        return {
          ...record,
          charge: centsToMoney(record.chargeCents),
          charged: centsToMoney(record.chargeCents),
          paid: centsToMoney(paidCents),
          balance: centsToMoney(balanceCents),
          exactPaid: centsToMoney(allocation?.exactPaid ?? 0),
          legacyPaid: centsToMoney(allocation?.legacyPaid ?? 0),
          paymentStatus: record.chargeCents <= 0 ? "none" : balanceCents <= 0 ? "paid" : paidCents > 0 ? "partial" : "pending",
        };
      }),
      payments: paymentRows.map((payment) => {
        const activityId = activityIdFromReceipt(payment.receipt);
        const activity = activityId ? activityById.get(activityId) : null;
        const stored = readStoredPaymentNote(payment.note);
        return {
          ...payment,
          amount: centsToMoney(payment.amountCents),
          note: stored.note,
          method: stored.method,
          activityId,
          activityTitle: activity?.title ?? "Pago anterior sin concepto específico",
          activityCode: activity?.code ?? "",
          cardRowIndex: activity?.cardRowIndex ?? null,
          allocationMethod: activityId ? "exact" : "legacy",
        };
      }),
      notice: noticeRows[0] ?? null,
      settings: settingRows[0] ? {
        managementYear: settingRows[0].managementYear,
        theme: parseJson(settingRows[0].themeJson),
        labels: parseJson(settingRows[0].labelsJson),
      } : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
