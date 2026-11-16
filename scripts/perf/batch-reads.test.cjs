/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server fixtures, no live HR writes. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
require("tsx/cjs");
const serverOnly = require.resolve("server-only");
require.cache[serverOnly] = { id: serverOnly, filename: serverOnly, loaded: true, exports: {} };
const ORIGIN = "https://batch-performance-fixture.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
const baseline = process.env.HRMS_PERF_BASELINE === "1";
const { createClient } = require("@supabase/supabase-js");
const client = () => createClient(ORIGIN, "fixture-key", { auth: { persistSession: false, autoRefreshToken: false } });
const profile = { employee: { id: "ceo", organizationId: "org-a" }, roles: [{ code: "ceo" }], permissionCodes: [] };
function load(path, replacements = {}, append = "") {
  const filename = require.resolve(path);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (name) => replacements[name] ?? require(name);
  loaded._compile(ts.transpileModule(readFileSync(filename, "utf8") + append, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
function transport(t, respond) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, ORIGIN);
    const call = { path: url.pathname, table: url.pathname.split("/").pop(), params: url.searchParams, method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const value = await respond(call);
    return new Response(JSON.stringify(value.data ?? []), { status: value.status ?? 200, headers: { "content-type": "application/json", ...value.headers } });
  });
  return calls;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const employee = (i) => ({ employee_code: `FIX${i}`, first_name: "Fixture", last_name: String(i), email: "fixture@example.invalid", organization_id: "org-a", departments: { name: "Operations" } });
const roles = ["hr_admin", "manager", "employee", "hr_executive"];
const rows = Array.from({ length: 4 }, (_, i) => ({ id: `r${i}`, employee_id: `e${i}`, employees: employee(i), reason: "Fixture", created_at: "2026-11-09", correction_status: "pending", requested_check_in_at: null, requested_check_out_at: null, attendance: { attendance_date: "2026-11-09" }, leave_status: "pending", start_date: "2026-11-09", end_date: "2026-11-09", total_days: "1", is_half_day: false, half_day_period: null, leave_types: { name: "Casual", code: "CL" }, leave_approvals: [{ approval_level: 1, approval_status: "pending", employees: employee(9) }] }));
async function roleResponse(call) {
  await delay(20);
  const ids = call.params.get("employee_id").slice(4, -1).split(",").map((id) => id.replaceAll('"', ""));
  return { data: ids.flatMap((id) => /^e[0-3]$/.test(id) ? [{ employee_id: id, roles: { code: roles[Number(id.slice(1))] } }] : []) };
}
for (const kind of ["leave", "regularization"]) {
  test(`${kind} approval queue preserves row order, visibility and categories while batching role reads`, async (t) => {
    const realLeave = require("../../src/lib/leave/services/leave-queries.ts");
    let ensured = false;
    const hidden = { ...rows[0], id: "hidden", employee_id: "hidden", employees: { ...employee(8), email: "it@ifranchise.in" } };
    const calls = transport(t, async (call) => {
      assert.equal(call.method, "GET", "No approval writes in fixture");
      if (call.table === "user_roles") return roleResponse(call);
      if (kind === "leave") assert.equal(ensured, true, "Required routing preparation still finishes first");
      if (call.table === "leave_approvals") return { data: [...rows, hidden].map((row) => ({ id: `a-${row.id}`, leave_request_id: row.id, approval_level: 1 })) };
      assert.equal(call.params.get("employees.organization_id"), "eq.org-a");
      return { data: [...rows, { ...rows[0], id: "repeat" }, hidden] };
    });
    const loaded = load(`../../src/lib/ceo/services/ceo-${kind === "leave" ? "leave" : "regularization"}-queries.ts`, {
      "@/lib/leave/services/leave-queries": { ...realLeave, isCeoLeaveApprover: () => true, ensurePendingExecutiveLeaveAssignedToCeo: async () => { ensured = true; } },
    });
    const start = performance.now();
    const result = await (kind === "leave" ? loaded.listCeoApprovalQueue : loaded.listCeoRegularizationApprovalQueue)(client(), profile);
    const roleCalls = calls.filter((call) => call.table === "user_roles");
    assert.equal(roleCalls.length, baseline ? 4 : 1);
    assert.deepEqual(result.map((item) => item.id), kind === "leave" ? ["r0", "r1", "r2", "r3"] : ["r0", "r1", "r2", "r3", "repeat"]);
    assert.deepEqual(result.slice(0, 4).map((item) => item.requestCategory), ["hr", "manager", "hr", "hr"]);
    assert.deepEqual(result.slice(0, 4).map((item) => item.requestCategoryLabel), ["HR Request", "Manager Request", kind === "leave" ? "Employee Request" : "HR Request", "HR Request"]);
    assert.ok(roleCalls.every((call) => !call.params.get("employee_id").includes("hidden")));
    console.log(JSON.stringify({ fixture: kind, roleRequests: roleCalls.length, ms: Math.round(performance.now() - start) }));
  });
}
test("role read failures still propagate rather than misclassifying approval requests", async (t) => {
  transport(t, (call) => call.table === "user_roles" ? { status: 403, data: { message: "roles denied" } } : { data: rows });
  const realLeave = require("../../src/lib/leave/services/leave-queries.ts");
  const loaded = load("../../src/lib/ceo/services/ceo-regularization-queries.ts", { "@/lib/leave/services/leave-queries": { ...realLeave, isCeoLeaveApprover: () => true } });
  await assert.rejects(loaded.listCeoRegularizationApprovalQueue(client(), profile), /roles denied/);
});
test("batched role reads handle bounded URLs, duplicate IDs and server page limits without losing roles", async (t) => {
  const { getEmployeeRoleCodesByEmployeeIds } = require("../../src/lib/leave/services/leave-queries.ts");
  const calls = transport(t, (call) => {
    const ids = call.params.get("employee_id").slice(4, -1).split(",").map((id) => id.replaceAll('"', ""));
    assert.ok(ids.length <= 100);
    const all = ids.flatMap((id) => [0, 1, 2].map((i) => ({ employee_id: id, roles: { code: `role${i}` } })));
    const offset = Number(call.params.get("offset") ?? 0);
    const page = all.slice(offset, offset + 80);
    return { data: page, headers: { "content-range": `${offset}-${offset + page.length - 1}/${all.length}` } };
  });
  assert.equal((await getEmployeeRoleCodesByEmployeeIds([])).size, 0);
  assert.equal(calls.length, 0);
  const ids = Array.from({ length: 205 }, (_, i) => `employee${i}`);
  const result = await getEmployeeRoleCodesByEmployeeIds([...ids, ids[0], ""]);
  assert.equal(result.size, 205);
  assert.equal(calls.length, 9);
  for (const id of ids) assert.deepEqual(result.get(id), ["role0", "role1", "role2"]);
});
test("onboarding file signing preserves order, expiry, deduplication and individual failure fallbacks", async (t) => {
  let active = 0, peak = 0;
  const docs = Array.from({ length: 8 }, (_, i) => ({ id: `d${i}`, document_category: "identity", document_type_code: `type${i === 7 ? 0 : i}`, file_name: `file${i}`, file_size: "128", review_status: "pending", storage_path: `case-a/file${i}` }));
  const calls = transport(t, async (call) => {
    if (call.table === "onboarding_documents") {
      assert.equal(call.params.get("case_id"), "eq.case-a");
      assert.equal(call.params.get("deleted_at"), "is.null");
      return { data: docs };
    }
    assert.equal(call.method, "POST");
    assert.equal(call.body.expiresIn, 3600);
    active++; peak = Math.max(peak, active);
    await delay(25); active--;
    return call.table === "file3" ? { status: 400, data: { message: "file unavailable" } } : { data: { signedURL: `/object/sign/onboarding-documents/${call.table}?token=fixture` } };
  });
  t.mock.method(console, "error", () => {});
  const { loadCaseDocuments } = load("../../src/lib/onboarding/services/onboarding-queries.ts", {}, "\nexport { loadCaseDocuments };\n");
  const start = performance.now();
  const result = await loadCaseDocuments("case-a");
  const ms = Math.round(performance.now() - start);
  assert.equal(calls.length, 9);
  assert.equal(peak, baseline ? 1 : 4);
  assert.deepEqual(result.map((doc) => doc.id), ["d7", "d1", "d2", "d3", "d4", "d5", "d6"]);
  assert.equal(result.find((doc) => doc.id === "d3").signedUrl, null);
  assert.equal(console.error.mock.calls.length, 1);
  assert.ok(result.filter((doc) => doc.id !== "d3").every((doc) => doc.signedUrl.startsWith(ORIGIN) && doc.fileSize === 128));
  calls.length = 0;
  const unsigned = await loadCaseDocuments("case-a", { includeSignedUrls: false });
  assert.equal(calls.length, 1);
  assert.ok(unsigned.every((doc) => doc.signedUrl === null));
  console.log(JSON.stringify({ fixture: "onboarding", documents: 8, peak, ms }));
});
