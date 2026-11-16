/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the endpoint and transport in isolation. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

function load(relativePath, action) {
  const file = require.resolve(relativePath);
  const loaded = new Module(file, module);
  loaded.filename = file;
  loaded.require = (name) => name === "@/lib/notifications/actions"
    ? { getNotificationBellDataAction: action }
    : require(name);
  loaded._compile(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, file);
  return loaded.exports;
}

const route = "../../src/app/api/notifications/bell/route.ts";
const client = "../../src/lib/notifications/bell-client.ts";

test("notification endpoint preserves success/failure payloads and calls the existing authenticated function once", async () => {
  for (const result of [
    { success: true, data: { unreadCount: 2, items: [{ id: "fixture-1" }], soundEnabled: true, notificationSound: "classic" } },
    { success: false, message: "Not authenticated", data: { unreadCount: 0, items: [], soundEnabled: false, notificationSound: "classic" } },
  ]) {
    let calls = 0;
    const { POST } = load(route, async () => { calls++; return result; });
    const response = await POST(new Request("http://localhost:3000/api/notifications/bell", {
      method: "POST", headers: { origin: "http://localhost:3000" },
    }));
    assert.equal(calls, 1);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), result);
  }
});

test("notification endpoint rejects cross-origin, missing-origin and null-origin requests", async () => {
  let calls = 0;
  const { POST } = load(route, async () => { calls++; });
  for (const origin of ["https://evil.invalid", "null", undefined]) {
    const response = await POST(new Request("http://localhost:3000/api/notifications/bell", {
      method: "POST", headers: origin ? { origin } : {},
    }));
    assert.equal(response.status, 403);
  }
  assert.equal(calls, 0);
});

test("notification client uses a fresh same-origin request and propagates failures to the existing handler", async (t) => {
  const { fetchNotificationBellData } = load(client);
  const result = { success: false, message: "Existing failure" };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/notifications/bell");
    assert.deepEqual(options, {
      method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
    });
    return Response.json(result);
  });
  assert.deepEqual(await fetchNotificationBellData(), result);
  globalThis.fetch.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  await assert.rejects(fetchNotificationBellData(), /503/);
  globalThis.fetch.mock.mockImplementation(async () => { throw new Error("Network error"); });
  await assert.rejects(fetchNotificationBellData(), /Network error/);
});

test("a late poll cannot overwrite a newer poll or restore a notification already marked read", async () => {
  const { createNotificationBellReader } = load(client);
  const pending = [];
  const reader = createNotificationBellReader(() => new Promise((resolve) => pending.push(resolve)));
  const first = reader.read();
  const second = reader.read();
  const fresh = { success: true, data: { unreadCount: 0, items: [] } };
  pending[1](fresh);
  assert.equal(await second, fresh);
  pending[0]({ success: true, data: { unreadCount: 1, items: [{ id: "old" }] } });
  assert.equal(await first, null);

  const beforeMutation = reader.read();
  reader.invalidate();
  pending[2]({ success: true, data: { unreadCount: 1, items: [{ id: "read-now" }] } });
  assert.equal(await beforeMutation, null);
  const afterMutation = reader.read();
  pending[3](fresh);
  assert.equal(await afterMutation, fresh);
});

test("notification reader owners are isolated and failures still propagate", async () => {
  const { createNotificationBellReader } = load(client);
  let resolve;
  const first = createNotificationBellReader(() => new Promise((done) => { resolve = done; }));
  const result = { success: true, data: { unreadCount: 0, items: [] } };
  const second = createNotificationBellReader(async () => result);
  const request = first.read();
  second.invalidate();
  resolve(result);
  assert.equal(await request, result);
  const failure = new Error("Existing failure");
  const failing = createNotificationBellReader(async () => { throw failure; });
  await assert.rejects(failing.read(), (error) => error === failure);
});
