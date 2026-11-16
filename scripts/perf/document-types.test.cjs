/* eslint-disable @typescript-eslint/no-require-imports -- Isolated document metadata fixtures. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
require("tsx/cjs");
const serverOnly = require.resolve("server-only");
require.cache[serverOnly] = { id: serverOnly, filename: serverOnly, loaded: true, exports: {} };
const ORIGIN = "https://document-types-fixture.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
const { createClient } = require("@supabase/supabase-js");
const { EXPLORER_DOCUMENT_TYPE_SEED: seeds } = require("../../src/lib/employee/documents/categories.ts");
const { ensureExplorerDocumentTypes } = require("../../src/lib/employee/services/ensure-explorer-document-types.ts");
const client = () => createClient(ORIGIN, "fixture-key", { auth: { persistSession: false, autoRefreshToken: false } });
const existingRows = () => seeds.map((seed) => ({ code: seed.code, name: seed.name, description: seed.description }));
function transport(t, respond) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, ORIGIN);
    const call = { method: init.method ?? "GET", params: url.searchParams, body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const value = await respond(call);
    return new Response(JSON.stringify(value.data ?? []), { status: value.status ?? 200, headers: { "content-type": "application/json" } });
  });
  return calls;
}
test("unchanged document metadata needs one read and zero writes on every load", async (t) => {
  const calls = transport(t, () => ({ data: existingRows() }));
  await ensureExplorerDocumentTypes(client(), "org-a");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].params.get("organization_id"), "eq.org-a");
  assert.equal(calls[0].params.get("deleted_at"), "is.null");
  await ensureExplorerDocumentTypes(client(), "org-b");
  assert.equal(calls.length, 2, "No cross-organization or persistent freshness cache");
  assert.equal(calls[1].params.get("organization_id"), "eq.org-b");
});
test("changed names and descriptions are corrected in existing seed order with timestamps", async (t) => {
  const rows = existingRows(); rows[0].name = "Old name"; rows[2].description = "Old description";
  const calls = transport(t, (call) => ({ data: call.method === "GET" ? rows : [] }));
  await ensureExplorerDocumentTypes(client(), "org-a");
  assert.deepEqual(calls.map((call) => call.method), ["GET", "PATCH", "PATCH"]);
  for (const [index, seedIndex] of [0, 2].entries()) {
    const call = calls[index + 1], seed = seeds[seedIndex];
    assert.equal(call.params.get("code"), `eq.${seed.code}`);
    assert.equal(call.params.get("organization_id"), "eq.org-a");
    assert.equal(call.params.get("deleted_at"), "is.null");
    assert.equal(call.body.name, seed.name);
    assert.equal(call.body.description, seed.description);
    assert.ok(Number.isFinite(Date.parse(call.body.updated_at)));
  }
});
test("missing document types are still seeded with the same values before correcting existing types", async (t) => {
  const rows = existingRows().slice(1); rows[0].name = "Old name";
  const calls = transport(t, (call) => ({ data: call.method === "GET" ? rows : [] }));
  await ensureExplorerDocumentTypes(client(), "org-a");
  assert.deepEqual(calls.map((call) => call.method), ["GET", "POST", "PATCH"]);
  assert.deepEqual(calls[1].body, [{ organization_id: "org-a", name: seeds[0].name, code: seeds[0].code, description: seeds[0].description, is_required: seeds[0].isRequired, requires_expiry: false, status: "active" }]);
});
test("document-type read and insert failures retain logging and fallback behavior", async (t) => {
  t.mock.method(console, "error", () => {});
  let failRead = true;
  const rows = existingRows().slice(1); rows[0].name = "Old name";
  const calls = transport(t, (call) => failRead || call.method === "POST"
    ? { status: 400, data: { message: "fixture failure" } }
    : { data: call.method === "GET" ? rows : [] });
  await ensureExplorerDocumentTypes(client(), "org-a");
  assert.equal(calls.length, 1);
  assert.equal(console.error.mock.calls[0].arguments[0], "[documents] failed to list document types");
  failRead = false; calls.length = 0;
  await ensureExplorerDocumentTypes(client(), "org-a");
  assert.deepEqual(calls.map((call) => call.method), ["GET", "POST", "PATCH"]);
  assert.equal(console.error.mock.calls[1].arguments[0], "[documents] failed to seed explorer document types");
});
test("a 14-type fixture removes the sequential update waterfall while still reading fresh metadata", async (t) => {
  let writes = 0;
  transport(t, async (call) => {
    if (call.method === "PATCH") { writes++; await new Promise((resolve) => setTimeout(resolve, 20)); }
    return { data: call.method === "GET" ? existingRows() : [] };
  });
  const filename = require.resolve("../../src/lib/employee/services/ensure-explorer-document-types.ts");
  const original = readFileSync(filename, "utf8");
  // Restore the former refresh-all behavior for a controlled comparison.
  const former = original.replace("organizationId, changedNames", "organizationId, EXPLORER_DOCUMENT_TYPE_SEED");
  const loaded = new Module(filename, module); loaded.filename = filename; loaded.require = require;
  loaded._compile(ts.transpileModule(former, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  const start = performance.now(); await loaded.exports.ensureExplorerDocumentTypes(client(), "org-a");
  const beforeMs = Math.round(performance.now() - start), beforeWrites = writes;
  writes = 0;
  const afterStart = performance.now(); await ensureExplorerDocumentTypes(client(), "org-a");
  const afterMs = Math.round(performance.now() - afterStart);
  assert.equal(beforeWrites, 14); assert.equal(writes, 0);
  console.log(JSON.stringify({ fixture: "document-types", beforeMs, afterMs, beforeWrites, afterWrites: writes }));
});
