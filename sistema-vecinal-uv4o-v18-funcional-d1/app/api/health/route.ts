import { ensureDatabase } from "../../../db/init";
import { getD1 } from "../../../db";

export async function GET() {
  try {
    await ensureDatabase();
    const result = await getD1().prepare("SELECT 1 AS ok").first<{ ok: number }>();
    return Response.json({ ok: result?.ok === 1, database: "D1" });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Database error" }, { status: 503 });
  }
}
