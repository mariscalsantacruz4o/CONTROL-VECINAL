import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://vecinal.test/", { headers: { accept: "text/html", host: "vecinal.test" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the neighbor card directly", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Sistema Vecinal Digital/i);
  assert.match(html, /Tarjeta de control vecinal/i);
  assert.match(html, /Martha/i);
  assert.match(html, /N° DE LOTE/i);
  assert.match(html, /Próximo evento/i);
  assert.match(html, /Deuda total calculada/i);
  assert.match(html, />Otros</i);
  assert.match(html, /Trabajos, Cuadro 24/i);
  assert.doesNotMatch(html, /¿Cómo desea revisar su tarjeta\?/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("emits a site-specific social preview", async () => {
  const html = await (await render()).text();
  assert.match(html, /property="og:title" content="Sistema Vecinal Digital"/i);
  assert.match(html, /https:\/\/vecinal\.test\/og\.png/i);
});
