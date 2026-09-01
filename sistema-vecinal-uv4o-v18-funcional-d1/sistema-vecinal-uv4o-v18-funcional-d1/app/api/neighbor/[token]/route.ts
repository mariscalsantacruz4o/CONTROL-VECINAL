import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { activities, attendanceRecords, neighbors, notices, payments, systemSettings } from "../../../../db/schema";
import { apiError, centsToMoney } from "../../_shared";

function parseJson(value: string) {
  try { return JSON.parse(value) as unknown; } catch { return {}; }
}

const privateHeaders = { "cache-control": "private, no-store, max-age=0" };

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    await ensureDatabase();
    const { token: rawToken } = await context.params;
    const token = rawToken.trim();
    if (token.length < 16 || token.length > 128) {
      return Response.json({ error: "Tarjeta vecinal no encontrada" }, { status: 404, headers: privateHeaders });
    }
    const db = getDb();
    const [neighbor] = await db.select().from(neighbors).where(eq(neighbors.token, token)).limit(1);
    if (!neighbor || !neighbor.active) return Response.json({ error: "Tarjeta vecinal no encontrada" }, { status: 404, headers: privateHeaders });
    const [activityRows, attendanceRows, paymentRows, noticeRows, settingRows] = await Promise.all([
      db.select().from(activities).orderBy(asc(activities.cardRowIndex), asc(activities.cardSlotIndex)),
      db.select().from(attendanceRecords).where(eq(attendanceRecords.neighborId, neighbor.id)),
      db.select().from(payments).where(eq(payments.neighborId, neighbor.id)).orderBy(desc(payments.date), desc(payments.id)),
      db.select().from(notices).limit(1),
      db.select().from(systemSettings).limit(1),
    ]);
    const attendanceByActivity = new Map(attendanceRows.map((record) => [record.activityId, record]));
    const generatedCents = attendanceRows.reduce((sum, record) => sum + record.chargeCents, 0);
    const paidCents = paymentRows.reduce((sum, payment) => sum + payment.amountCents, 0);
    return Response.json({
      neighbor: { id: neighbor.id, code: neighbor.code, name: neighbor.name, street: neighbor.street, lot: neighbor.lot },
      cardEntries: activityRows.map((activity) => {
        const attendance = attendanceByActivity.get(activity.id);
        return {
          id: activity.id,
          type: activity.type,
          title: activity.title,
          date: activity.date,
          amount: centsToMoney(activity.amountCents),
          status: attendance?.status ?? "Programada",
          charge: centsToMoney(attendance?.chargeCents ?? 0),
          cardRowIndex: activity.cardRowIndex,
          cardSlotIndex: activity.cardSlotIndex,
        };
      }),
      payments: paymentRows.map((payment) => ({ id: payment.id, date: payment.date, amount: centsToMoney(payment.amountCents), note: payment.note, receipt: payment.receipt })),
      totals: { generated: centsToMoney(generatedCents), paid: centsToMoney(paidCents), balance: centsToMoney(Math.max(0, generatedCents - paidCents)) },
      notice: noticeRows[0] ?? null,
      settings: settingRows[0] ? { managementYear: settingRows[0].managementYear, theme: parseJson(settingRows[0].themeJson), labels: parseJson(settingRows[0].labelsJson) } : null,
    }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
