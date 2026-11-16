/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server-module regression fixtures. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
require("tsx/cjs");
const serverOnly = require.resolve("server-only");
require.cache[serverOnly] = { id: serverOnly, filename: serverOnly, loaded: true, exports: {} };
const ORIGIN = "https://final-performance-fixture.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
const baseline = process.env.HRMS_PERF_BASELINE === "1";
const { createClient } = require("@supabase/supabase-js");
const profile = {
  userId: "user-a", email: "fixture@example.invalid", permissionCodes: [], roles: [],
  employee: { id: "employee-a", organizationId: "org-a", employeeCode: "FIX001", firstName: "Fixture", lastName: "Employee" },
};
const client = () => createClient(ORIGIN, "fixture-key", { auth: { persistSession: false, autoRefreshToken: false } });

function load(relativePath, replacements) {
  const filename = require.resolve(relativePath);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (name) => replacements[name] ?? require(name);
  loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return loaded.exports;
}

function transport(t, respond) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, ORIGIN, "A fixture must never contact a real service");
    const call = { table: url.pathname.split("/").pop(), method: init.method ?? "GET", params: url.searchParams, body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const response = await respond(call);
    return new Response(call.method === "HEAD" ? null : JSON.stringify(response.data ?? []), {
      status: response.status ?? 200,
      headers: { "content-type": "application/json", ...(response.headers ?? {}) },
    });
  });
  return calls;
}

test("notification bell keeps the full unread count, newest eight items and preferences with one list/count query", async (t) => {
  const { getNotificationBellData } = require("../../src/lib/notifications/services/notification-queries.ts");
  const items = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, title: `Item ${i}`, message: "Fixture", module: "attendance", priority: "low", notification_status: "unread", action_url: null, created_at: "2026-11-09" }));
  const calls = transport(t, ({ table }) => ({
    data: table === "notifications" ? items : [{ mute_notifications: true, notification_sound: "classic" }],
    headers: { "content-range": "0-7/37" },
  }));
  const result = await getNotificationBellData(client(), profile);
  assert.equal(result.unreadCount, 37);
  assert.equal(result.items.length, 8);
  assert.equal(result.items[0].id, "n0");
  assert.equal(result.soundEnabled, false);
  assert.equal(calls.length, baseline ? 3 : 2);
  for (const call of calls) {
    assert.equal(call.params.get("organization_id"), "eq.org-a");
    assert.equal(call.params.get("user_id"), "eq.user-a");
    assert.equal(call.params.get("deleted_at"), "is.null");
  }
});

test("notification list failure preserves the independent unread count and empty-items fallback", async (t) => {
  const { getNotificationBellData } = require("../../src/lib/notifications/services/notification-queries.ts");
  transport(t, ({ table, method }) => table === "notifications" && method !== "HEAD"
    ? { data: { message: "list unavailable", code: "P0001" }, status: 400 }
    : { data: [], headers: { "content-range": "*/37" } });
  const result = await getNotificationBellData(client(), profile);
  assert.equal(result.unreadCount, 37);
  assert.deepEqual(result.items, []);
});

test("notification preferences errors still propagate", async (t) => {
  const { getNotificationBellData } = require("../../src/lib/notifications/services/notification-queries.ts");
  transport(t, ({ table }) => table === "notification_user_preferences"
    ? { data: { message: "preferences denied", code: "42501" }, status: 403 }
    : { data: [], headers: { "content-range": "*/0" } });
  await assert.rejects(getNotificationBellData(client(), profile), /preferences denied/);
});

test("fresh activity does no work; stale or missing activity still requires authentication before writing", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-09T12:00:00Z") });
  const { IDLE_ACTIVITY_COOKIE, IDLE_ACTIVITY_COOKIE_REFRESH_MS } = require("../../src/lib/auth/constants.ts");
  let timestamp = String(Date.now()), authenticated = true, authCalls = 0;
  const writes = [];
  const { touchSessionActivityAction } = load("../../src/lib/auth/actions.ts", {
    "next/headers": { cookies: async () => ({ get: (name) => name === IDLE_ACTIVITY_COOKIE && timestamp ? { value: timestamp } : undefined, set: (...args) => writes.push(args) }) },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => { authCalls++; return { data: { user: authenticated ? { id: "user-a" } : null } }; } } }) },
  });
  await touchSessionActivityAction();
  assert.equal(authCalls, baseline ? 1 : 0);
  assert.equal(writes.length, 0);
  for (const value of [undefined, String(Date.now() - IDLE_ACTIVITY_COOKIE_REFRESH_MS)]) {
    timestamp = value; authCalls = 0; writes.length = 0;
    await touchSessionActivityAction();
    assert.equal(authCalls, 1);
    assert.equal(writes.length, 1);
    assert.equal(writes[0][0], IDLE_ACTIVITY_COOKIE);
    assert.equal(writes[0][1], String(Date.now()));
    assert.equal(writes[0][2].httpOnly, true);
    assert.equal(writes[0][2].sameSite, "lax");
  }
  authenticated = false; timestamp = undefined; writes.length = 0; authCalls = 0;
  await touchSessionActivityAction();
  assert.equal(authCalls, 1);
  assert.equal(writes.length, 0);
});

test("notification recipient options match the full employee-form bundle with one instead of ten reads", async (t) => {
  const { getEmployeeLookups, getManagers } = require("../../src/lib/employees/services/employee-queries.ts");
  const calls = transport(t, ({ table }) => ({ data: table === "employees" ? [{ id: "employee-a", first_name: "Fixture", last_name: "Employee", employee_code: "FIX001" }] : [] }));
  const full = await getEmployeeLookups(client(), "org-a");
  assert.equal(calls.length, 10);
  calls.length = 0;
  const narrow = await getManagers(client(), "org-a");
  assert.deepEqual(narrow, full.managers);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].params.get("organization_id"), "eq.org-a");
  assert.equal(calls[0].params.get("app_hidden_at"), "is.null");
});
