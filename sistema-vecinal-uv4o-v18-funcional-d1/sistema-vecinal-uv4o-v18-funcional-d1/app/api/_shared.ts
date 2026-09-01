export function adminIdentity(request: Request) {
  const host = new URL(request.url).hostname;
  if (host === "localhost" || host === "127.0.0.1") return "local-admin";
  return request.headers.get("cf-access-authenticated-user-email")?.trim() || null;
}

export function requireAdmin(request: Request) {
  const identity = adminIdentity(request);
  return identity
    ? { identity, error: null }
    : {
        identity: null,
        error: Response.json(
          { error: "Acceso administrativo requerido" },
          { status: 401, headers: { "cache-control": "private, no-store, max-age=0" } },
        ),
      };
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Error inesperado";
  const isConstraint = message.includes("UNIQUE constraint failed") || message.includes("CHECK constraint failed");
  return Response.json(
    { error: isConstraint ? "El registro se repite o contiene un valor inválido" : message },
    { status: isConstraint ? 409 : 500, headers: { "cache-control": "private, no-store, max-age=0" } },
  );
}

export function moneyToCents(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Monto inválido");
  return Math.round((amount + Number.EPSILON) * 100);
}

export function centsToMoney(value: number) {
  return value / 100;
}

export function cleanText(value: unknown, maximum = 180) {
  return String(value ?? "").trim().slice(0, maximum);
}
