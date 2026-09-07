import { eq } from "drizzle-orm";
import { getD1, getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/init";
import { auditLog, neighbors } from "../../../../db/schema";
import { apiError, cleanText, requireAdmin } from "../../_shared";

type LotConflict = { id: number; name: string; lot: string };

function normalizeLot(value: unknown) {
  const lot = cleanText(value, 30).replace(/\s+/g, " ").toUpperCase();
  return lot || "—";
}

function isProvisionalLot(lot: string) {
  return !lot || lot === "—";
}

function lotComparisonKey(lot: string) {
  return lot.replace(/\s+/g, "").toUpperCase();
}

async function findLotConflict(lot: string, ignoredNeighborId = -1) {
  if (isProvisionalLot(lot)) return null;
  return getD1().prepare(`
    SELECT id, name, lot
    FROM neighbors
    WHERE trim(lot) <> ''
      AND trim(lot) <> '—'
      AND upper(replace(trim(lot), ' ', '')) = upper(replace(trim(?), ' ', ''))
      AND id <> ?
    LIMIT 1
  `).bind(lot, ignoredNeighborId).first<LotConflict>();
}

function duplicateLotResponse(lot: string, conflict: LotConflict | null) {
  const owner = conflict?.name ? ` a nombre de ${conflict.name}` : "";
  return Response.json(
    { error: `El lote ${lot} ya está registrado${owner}` },
    { status: 409, headers: { "cache-control": "private, no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = cleanText(body.name, 120);
    const street = cleanText(body.street, 120);
    const lot = normalizeLot(body.lot);
    if (!name || !street || !lot) return Response.json({ error: "Nombre, calle y lote son obligatorios" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const conflict = await findLotConflict(lot);
    if (conflict) return duplicateLotResponse(lot, conflict);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return message.includes("LOT_DUPLICADO") ? duplicateLotResponse("indicado", null) : apiError(error);
  }
}

export async function PATCH(request: Request) {
  const access = requireAdmin(request);
  if (access.error) return access.error;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    const name = cleanText(body.name, 120);
    const street = cleanText(body.street, 120);
    const lot = normalizeLot(body.lot);
    if (!id || !name || !street || !lot) return Response.json({ error: "Datos incompletos" }, { status: 400 });
    await ensureDatabase();
    const db = getDb();
    const currentNeighbor = await getD1().prepare("SELECT id, name, lot FROM neighbors WHERE id = ? LIMIT 1").bind(id).first<LotConflict>();
    if (!currentNeighbor) return Response.json({ error: "Vecino no encontrado" }, { status: 404 });
    const conflict = lotComparisonKey(currentNeighbor.lot) === lotComparisonKey(lot)
      ? null
      : await findLotConflict(lot, id);
    if (conflict) return duplicateLotResponse(lot, conflict);
    const [neighbor] = await db.update(neighbors).set({ name, street, lot, phone: cleanText(body.phone, 30), updatedAt: new Date().toISOString() }).where(eq(neighbors.id, id)).returning();
    await db.insert(auditLog).values({ action: "update", entityType: "neighbor", entityId: String(id), actorEmail: access.identity ?? "", detailJson: JSON.stringify({ name, lot }) });
    return Response.json({ neighbor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return message.includes("LOT_DUPLICADO") ? duplicateLotResponse("indicado", null) : apiError(error);
  }
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
