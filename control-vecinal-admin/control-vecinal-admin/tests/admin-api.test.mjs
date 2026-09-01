import assert from "node:assert/strict";
import test from "node:test";
import { Miniflare } from "miniflare";

test("el panel administra vecinos, actividades, deudas y pagos en D1", async () => {
  const mf = new Miniflare({
    modules: true,
    scriptPath: "worker-dist/index.js",
    compatibilityDate: "2026-05-15",
    d1Databases: { DB: "admin-test-db" },
    serviceBindings: { ASSETS: async () => new Response("asset") },
  });

  const request = async (path, init = {}) => {
    const response = await mf.dispatchFetch(`http://localhost${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
    const body = await response.json();
    assert.ok(response.ok, `${response.status}: ${JSON.stringify(body)}`);
    return body;
  };

  try {
    const initial = await request("/api/admin/state");
    assert.equal(initial.neighbors.length, 0);

    const createdNeighbor = await request("/api/admin/neighbors", {
      method: "POST",
      body: JSON.stringify({ name: "Vecino de prueba", street: "Calle de prueba", lot: "10", phone: "70000000" }),
    });
    const neighborId = createdNeighbor.neighbor.id;

    const editedNeighbor = await request("/api/admin/neighbors", {
      method: "PATCH",
      body: JSON.stringify({ id: neighborId, name: "Vecino corregido", street: "Avenida principal", lot: "11", phone: "71111111" }),
    });
    assert.equal(editedNeighbor.neighbor.lot, "11");

    const createdActivity = await request("/api/admin/activities", {
      method: "POST",
      body: JSON.stringify({ type: "Trabajo comunal", title: "Limpieza general", date: "2026-08-24", fine: 50 }),
    });
    const activityId = createdActivity.activity.id;

    const editedActivity = await request("/api/admin/activities", {
      method: "PATCH",
      body: JSON.stringify({ id: activityId, type: "Trabajo comunal", title: "Limpieza corregida", date: "2026-08-25", fine: 35 }),
    });
    assert.equal(editedActivity.activity.fine, 35);

    const attendance = await request("/api/admin/attendance", {
      method: "PUT",
      body: JSON.stringify({ activityId, records: [{ neighborId, status: "Faltó", note: "Prueba local" }] }),
    });
    assert.equal(attendance.generated, 35);

    const payment = await request("/api/admin/payments", {
      method: "POST",
      body: JSON.stringify({ neighborId, amount: 15, date: "2026-08-26", note: "Pago parcial" }),
    });
    assert.equal(payment.balance, 20);

    await request("/api/admin/notice", {
      method: "PUT",
      body: JSON.stringify({ title: "Próxima asamblea", body: "Aviso de prueba", active: true, eventType: "Asamblea", eventDate: "2026-09-01", eventTime: "19:00", eventPlace: "Sede vecinal", whatsapp: "59170000000" }),
    });
    await request("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ managementYear: "2026", theme: { primary: "#123d70" }, labels: { simpleTitle: "Tarjeta vecinal" } }),
    });

    const state = await request("/api/admin/state");
    assert.equal(state.neighbors[0].name, "Vecino corregido");
    assert.equal(state.neighbors[0].generated, 35);
    assert.equal(state.neighbors[0].paid, 15);
    assert.equal(state.activities[0].title, "Limpieza corregida");
    assert.equal(state.notice.title, "Próxima asamblea");
    assert.equal(state.settings.managementYear, "2026");

    await request(`/api/admin/neighbors?id=${neighborId}`, { method: "DELETE" });
    const finalState = await request("/api/admin/state");
    assert.equal(finalState.neighbors.length, 0);
  } finally {
    await mf.dispose();
  }
});
