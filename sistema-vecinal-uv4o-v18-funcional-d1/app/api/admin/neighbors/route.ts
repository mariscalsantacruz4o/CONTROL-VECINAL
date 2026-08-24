import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { auditLog, neighbors } from "../../../../db/schema";
import { apiError, cleanText, requireAdmin } from "../../_shared";

export async function POST(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = cleanText(body.name, 120);
    const street = cleanText(body.street, 120);
    const lot = cleanText(body.lot, 30);
    if (!name || !street || !lot) return Response.json({ error: "Nombre, calle y lote son obligatorios" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const token = crypto.randomUUID().replaceAll("-", "");
    const temporaryCode = `PENDING-${crypto.randomUUID()}`;
    const [created] = await db.insert(neighbors).values({
      code: temporaryCode,
      token,
      name,
      street,
      lot,
      phone: cleanText(body.phone, 30),
      active: true,
    }).returning();
    const code = `U.V. 4-O-${String(created.id).padStart(3, "0")}`;
    const [neighbor] = await db.update(neighbors).set({ code, updatedAt: new Date().toISOString() }).where(eq(neighbors.id, created.id)).returning();
    await db.insert(auditLog).values({ action: "create", entityType: "neighbor", entityId: String(neighbor.id), actorEmail: access.identity ?? "", detailJson: JSON.stringify({ name, lot }) });
    return Response.json({ neighbor: { ...neighbor, generated: 0, paid: 0 } }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    const name = cleanText(body.name, 120);
    const street = cleanText(body.street, 120);
    const lot = cleanText(body.lot, 30);
    if (!id || !name || !street || !lot) return Response.json({ error: "Datos incompletos" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const [neighbor] = await db.update(neighbors).set({ name, street, lot, phone: cleanText(body.phone, 30), updatedAt: new Date().toISOString() }).where(eq(neighbors.id, id)).returning();
    if (!neighbor) return Response.json({ error: "Vecino no encontrado" }, { status: 404 });
    await db.insert(auditLog).values({ action: "update", entityType: "neighbor", entityId: String(id), actorEmail: access.identity ?? "", detailJson: JSON.stringify({ name, lot }) });
    return Response.json({ neighbor });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return Response.json({ error: "Identificador inválido" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const [neighbor] = await db.delete(neighbors).where(eq(neighbors.id, id)).returning();
    if (!neighbor) return Response.json({ error: "Vecino no encontrado" }, { status: 404 });
    await db.insert(auditLog).values({ action: "delete", entityType: "neighbor", entityId: String(id), actorEmail: access.identity ?? "", detailJson: JSON.stringify({ name: neighbor.name, lot: neighbor.lot }) });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
