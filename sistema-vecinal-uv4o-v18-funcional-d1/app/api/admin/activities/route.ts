import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { activities, attendanceRecords, auditLog } from "../../../../db/schema";
import { apiError, cleanText, moneyToCents, requireAdmin } from "../../_shared";

function rowForType(type: string) {
  const value = type.toLocaleLowerCase("es");
  if (value.includes("asamblea") || value.includes("reunión") || value.includes("reunion")) return 0;
  if (value.includes("cuota mensual")) return 1;
  if (value.includes("cuota extra") || value.includes("aporte")) return 2;
  if (value.includes("trabajo")) return 4;
  return 3;
}

function chooseSlot(row: number, date: string, existing: Array<{ id: number; cardRowIndex: number; cardSlotIndex: number }>, ignoredId?: number) {
  const used = new Set(existing.filter((activity) => activity.id !== ignoredId && activity.cardRowIndex === row).map((activity) => activity.cardSlotIndex));
  if (row <= 1) {
    const month = Math.max(0, Math.min(11, Number(date.slice(5, 7)) - 1));
    if (!used.has(month)) return month;
  }
  const limit = row === 4 ? 24 : 12;
  for (let index = 0; index < limit; index += 1) if (!used.has(index)) return index;
  return -1;
}

export async function POST(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const type = cleanText(body.type, 80);
    const title = cleanText(body.title, 160);
    const date = cleanText(body.date, 10);
    if (!type || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Tipo, nombre y fecha son obligatorios" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const existing = await db.select({ id: activities.id, cardRowIndex: activities.cardRowIndex, cardSlotIndex: activities.cardSlotIndex }).from(activities);
    const cardRowIndex = rowForType(type);
    const cardSlotIndex = chooseSlot(cardRowIndex, date, existing);
    if (cardSlotIndex < 0) return Response.json({ error: "No quedan cuadros disponibles en esa categoría" }, { status: 409 });
    const temporaryCode = `PENDING-${crypto.randomUUID()}`;
    const [created] = await db.insert(activities).values({ type, title, date, amountCents: moneyToCents(body.fine), code: temporaryCode, cardRowIndex, cardSlotIndex }).returning();
    const code = `ACT-${String(created.id).padStart(3, "0")}`;
    const [activity] = await db.update(activities).set({ code, updatedAt: new Date().toISOString() }).where(eq(activities.id, created.id)).returning();
    await db.insert(auditLog).values({ action: "create", entityType: "activity", entityId: String(activity.id), actorEmail: access.identity ?? "", detailJson: JSON.stringify({ type, title, date }) });
    return Response.json({ activity: { ...activity, fine: activity.amountCents / 100 } }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    const type = cleanText(body.type, 80);
    const title = cleanText(body.title, 160);
    const date = cleanText(body.date, 10);
    if (!id || !type || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Datos incompletos" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const existing = await db.select({ id: activities.id, cardRowIndex: activities.cardRowIndex, cardSlotIndex: activities.cardSlotIndex }).from(activities);
    const cardRowIndex = rowForType(type);
    const cardSlotIndex = chooseSlot(cardRowIndex, date, existing, id);
    if (cardSlotIndex < 0) return Response.json({ error: "No quedan cuadros disponibles en esa categoría" }, { status: 409 });
    const amountCents = moneyToCents(body.fine);
    const [activity] = await db.update(activities).set({ type, title, date, amountCents, cardRowIndex, cardSlotIndex, updatedAt: new Date().toISOString() }).where(eq(activities.id, id)).returning();
    if (!activity) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
    await db.update(attendanceRecords).set({ chargeCents: amountCents, updatedAt: new Date().toISOString() }).where(and(eq(attendanceRecords.activityId, id), eq(attendanceRecords.status, "Faltó")));
    await db.insert(auditLog).values({ action: "update", entityType: "activity", entityId: String(id), actorEmail: access.identity ?? "", detailJson: JSON.stringify({ type, title, date, amountCents }) });
    return Response.json({ activity: { ...activity, fine: activity.amountCents / 100 } });
  } catch (error) { return apiError(error); }
}
