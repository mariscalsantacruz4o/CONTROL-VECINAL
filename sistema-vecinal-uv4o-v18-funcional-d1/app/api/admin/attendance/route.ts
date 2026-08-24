import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { activities, neighbors } from "../../../../db/schema";
import { apiError, cleanText, requireAdmin } from "../../_shared";

const allowedStatuses = new Set(["Presente", "Faltó", "Justificado"]);

export async function PUT(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as { activityId?: unknown; records?: Array<{ neighborId?: unknown; status?: unknown; note?: unknown }> };
    const activityId = Number(body.activityId);
    if (!activityId || !Array.isArray(body.records)) return Response.json({ error: "Lista de asistencia inválida" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
    if (!activity) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
    const validNeighborIds = new Set((await db.select({ id: neighbors.id }).from(neighbors).where(eq(neighbors.active, true))).map((neighbor) => neighbor.id));
    const records = body.records.map((record) => ({
      neighborId: Number(record.neighborId),
      status: cleanText(record.status, 20),
      note: cleanText(record.note, 300),
    }));
    if (records.some((record) => !validNeighborIds.has(record.neighborId) || !allowedStatuses.has(record.status))) return Response.json({ error: "La asistencia contiene un vecino o estado inválido" }, { status: 400 });
    const d1 = getD1();
    const now = new Date().toISOString();
    const statements = records.map((record) => d1.prepare(`
      INSERT INTO attendance_records (activity_id, neighbor_id, status, charge_cents, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(activity_id, neighbor_id) DO UPDATE SET
        status = excluded.status,
        charge_cents = excluded.charge_cents,
        note = excluded.note,
        updated_at = excluded.updated_at
    `).bind(activityId, record.neighborId, record.status, record.status === "Faltó" ? activity.amountCents : 0, record.note, now, now));
    statements.push(d1.prepare("UPDATE activities SET status = 'Cerrada', updated_at = ? WHERE id = ?").bind(now, activityId));
    statements.push(d1.prepare("INSERT INTO audit_log (action, entity_type, entity_id, actor_email, detail_json) VALUES (?, ?, ?, ?, ?)").bind("save", "attendance", String(activityId), access.identity ?? "", JSON.stringify({ records: records.length })));
    await d1.batch(statements);
    const absentCount = records.filter((record) => record.status === "Faltó").length;
    return Response.json({ ok: true, absentCount, generated: absentCount * activity.amountCents / 100 });
  } catch (error) { return apiError(error); }
}
