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

  const requestRaw = async (path, init = {}) => {
    const response = await mf.dispatchFetch(`http://localhost${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
    const body = await response.json();
    return { response, body };
  };

  const request = async (path, init = {}) => {
    const { response, body } = await requestRaw(path, init);
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

    const repeatedName = await request("/api/admin/neighbors", {
      method: "POST",
      body: JSON.stringify({ name: "Vecino de prueba", street: "Otra calle", lot: "12", phone: "" }),
    });
    assert.equal(repeatedName.neighbor.name, "Vecino de prueba");

    const duplicateLot = await requestRaw("/api/admin/neighbors", {
      method: "POST",
      body: JSON.stringify({ name: "Otra persona", street: "Calle duplicada", lot: " 10 ", phone: "" }),
    });
    assert.equal(duplicateLot.response.status, 409);
    assert.match(duplicateLot.body.error, /lote 10 ya está registrado/i);

    const provisionalOne = await request("/api/admin/neighbors", {
      method: "POST",
      body: JSON.stringify({ name: "Provisional uno", street: "POR COMPLETAR", lot: "—", phone: "" }),
    });
    const provisionalTwo = await request("/api/admin/neighbors", {
      method: "POST",
      body: JSON.stringify({ name: "Provisional dos", street: "POR COMPLETAR", lot: "—", phone: "" }),
    });
    assert.equal(provisionalOne.neighbor.lot, "—");
    assert.equal(provisionalTwo.neighbor.lot, "—");

    const editedNeighbor = await request("/api/admin/neighbors", {
      method: "PATCH",
      body: JSON.stringify({ id: neighborId, name: "Vecino corregido", street: "Avenida principal", lot: "11", phone: "71111111" }),
    });
    assert.equal(editedNeighbor.neighbor.lot, "11");

    const occupiedLotEdit = await requestRaw("/api/admin/neighbors", {
      method: "PATCH",
      body: JSON.stringify({ id: repeatedName.neighbor.id, name: "Vecino de prueba", street: "Otra calle", lot: "11", phone: "" }),
    });
    assert.equal(occupiedLotEdit.response.status, 409);
    assert.match(occupiedLotEdit.body.error, /lote 11 ya está registrado/i);

    const sameLotEdit = await request("/api/admin/neighbors", {
      method: "PATCH",
      body: JSON.stringify({ id: repeatedName.neighbor.id, name: "Vecino de prueba corregido", street: "Otra calle", lot: " 12 ", phone: "" }),
    });
    assert.equal(sameLotEdit.neighbor.lot, "12");

    const concurrent = await Promise.all([
      requestRaw("/api/admin/neighbors", {
        method: "POST",
        body: JSON.stringify({ name: "Concurrente uno", street: "Calle A", lot: "A 15", phone: "" }),
      }),
      requestRaw("/api/admin/neighbors", {
        method: "POST",
        body: JSON.stringify({ name: "Concurrente dos", street: "Calle B", lot: "a15", phone: "" }),
      }),
    ]);
    assert.deepEqual(concurrent.map(({ response }) => response.status).sort(), [201, 409]);
    const concurrentNeighbor = concurrent.find(({ response }) => response.status === 201)?.body.neighbor;
    assert.ok(concurrentNeighbor?.id);

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
      body: JSON.stringify({ title: "Próxima asamblea", body: "Aviso de prueba", active: true, imageUrl: "data:image/jpeg;base64,Zm90bw==", eventType: "Asamblea", eventDate: "2026-09-01", eventTime: "19:00", eventPlace: "Sede vecinal", whatsapp: "59170000000" }),
    });
    await request("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ managementYear: "2026", theme: { primary: "#123d70" }, labels: { simpleTitle: "Tarjeta vecinal" } }),
    });

    const state = await request("/api/admin/state");
    const savedNeighbor = state.neighbors.find((neighbor) => neighbor.id === neighborId);
    assert.equal(savedNeighbor.name, "Vecino corregido");
    assert.equal(savedNeighbor.generated, 35);
    assert.equal(savedNeighbor.paid, 15);
    assert.equal(state.neighbors.find((neighbor) => neighbor.id === repeatedName.neighbor.id).lot, "12");
    assert.equal(state.activities[0].title, "Limpieza corregida");
    assert.equal(state.notice.title, "Próxima asamblea");
    assert.equal(state.notice.imageUrl, "data:image/jpeg;base64,Zm90bw==");
    assert.equal(state.settings.managementYear, "2026");

    for (const id of [neighborId, repeatedName.neighbor.id, provisionalOne.neighbor.id, provisionalTwo.neighbor.id, concurrentNeighbor.id]) {
      await request(`/api/admin/neighbors?id=${id}`, { method: "DELETE" });
    }
    const finalState = await request("/api/admin/state");
    assert.equal(finalState.neighbors.length, 0);
  } finally {
    await mf.dispose();
  }
});
