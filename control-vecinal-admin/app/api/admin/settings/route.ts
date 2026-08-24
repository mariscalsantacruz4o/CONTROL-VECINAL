import { getD1 } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { apiError, cleanText, requireAdmin } from "../../_shared";

export async function PUT(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const managementYear = cleanText(body.managementYear, 4);
    if (!/^\d{4}$/.test(managementYear)) return Response.json({ error: "Gestión inválida" }, { status: 400 });
    await ensureDatabase();
    const now = new Date().toISOString();
    await getD1().batch([
      getD1().prepare(`
        INSERT INTO system_settings (id, management_year, theme_json, labels_json, updated_at)
        VALUES (1, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET management_year = excluded.management_year, theme_json = excluded.theme_json, labels_json = excluded.labels_json, updated_at = excluded.updated_at
      `).bind(managementYear, JSON.stringify(body.theme ?? {}), JSON.stringify(body.labels ?? {}), now),
      getD1().prepare("INSERT INTO audit_log (action, entity_type, entity_id, actor_email, detail_json) VALUES (?, ?, ?, ?, ?)").bind("update", "settings", "1", access.identity ?? "", JSON.stringify({ managementYear })),
    ]);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

