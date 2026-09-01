import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function request(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://vecinal.test${path}`, { headers: { accept: "text/html", host: "vecinal.test" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("the public entry screen never exposes demonstration neighbors", async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Sistema Vecinal Digital/i);
  assert.match(html, /Abriendo su tarjeta vecinal/i);
  assert.doesNotMatch(html, /Martha|Cyntia|Felipe|demo-martha/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("the public worker sends administrators to the protected worker", async () => {
  const response = await request("/admin");
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://control-vecinal-admin.mariscalsantacruz-4o.workers.dev/");
});

test("the public worker does not expose administrative APIs", async () => {
  const response = await request("/api/admin/state");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
});

test("the public source contains no old sample identity or token", async () => {
  const source = await readFile(new URL("../app/VecinalApp.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Martha|Cyntia|Felipe|demo-martha/i);
});

test("emits a site-specific social preview", async () => {
  const html = await (await request()).text();
  assert.match(html, /property="og:title" content="Sistema Vecinal Digital"/i);
  assert.match(html, /https:\/\/vecinal\.test\/og\.png/i);
});
