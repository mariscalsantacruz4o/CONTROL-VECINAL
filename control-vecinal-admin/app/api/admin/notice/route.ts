import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { apiError, cleanText, requireAdmin } from "../../_shared";

export async function PUT(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const title = cleanText(body.title, 160);
    const eventDate = cleanText(body.eventDate, 10);
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return Response.json({ error: "Título y fecha son obligatorios" }, { status: 400 });
    await ensureDatabase();
    const d1 = getD1();
    const now = new Date().toISOString();
    await d1.batch([
      d1.prepare(`
        INSERT INTO notices (id, title, body, active, image_url, event_type, event_date, event_time, event_place, whatsapp, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET title = excluded.title, body = excluded.body, active = excluded.active, image_url = excluded.image_url, event_type = excluded.event_type, event_date = excluded.event_date, event_time = excluded.event_time, event_place = excluded.event_place, whatsapp = excluded.whatsapp, updated_at = excluded.updated_at
      `).bind(title, cleanText(body.body, 800), body.active === false ? 0 : 1, cleanText(body.imageUrl, 500), cleanText(body.eventType, 80), eventDate, cleanText(body.eventTime, 5), cleanText(body.eventPlace, 160), cleanText(body.whatsapp, 30), now),
      d1.prepare("INSERT INTO audit_log (action, entity_type, entity_id, actor_email, detail_json) VALUES (?, ?, ?, ?, ?)").bind("update", "notice", "1", access.identity ?? "", JSON.stringify({ title, eventDate })),
    ]);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
