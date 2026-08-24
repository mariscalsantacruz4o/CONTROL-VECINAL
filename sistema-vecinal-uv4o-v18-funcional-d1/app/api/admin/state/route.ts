import { asc, desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { activities, attendanceRecords, neighbors, notices, payments, systemSettings } from "../../../../db/schema";
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
    for (const record of attendanceRows) generatedByNeighbor.set(record.neighborId, (generatedByNeighbor.get(record.neighborId) ?? 0) + record.chargeCents);
    const paidByNeighbor = new Map<number, number>();
    for (const payment of paymentRows) paidByNeighbor.set(payment.neighborId, (paidByNeighbor.get(payment.neighborId) ?? 0) + payment.amountCents);
    return Response.json({
      neighbors: neighborRows.map((neighbor) => ({
        ...neighbor,
        generated: centsToMoney(generatedByNeighbor.get(neighbor.id) ?? 0),
        paid: centsToMoney(paidByNeighbor.get(neighbor.id) ?? 0),
      })),
      activities: activityRows.map((activity) => ({ ...activity, fine: centsToMoney(activity.amountCents) })),
      attendance: attendanceRows.map((record) => ({ ...record, charge: centsToMoney(record.chargeCents) })),
      payments: paymentRows.map((payment) => ({ ...payment, amount: centsToMoney(payment.amountCents) })),
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
