/* eslint-disable @typescript-eslint/no-require-imports -- Exercise real services with an isolated HTTP fixture. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
require("tsx/cjs");
const marker = require.resolve("server-only");
require.cache[marker] = { id: marker, filename: marker, loaded: true, exports: {} };
const ORIGIN = "https://attendance-performance-fixture.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-key";
const baseline = process.env.HRMS_PERF_BASELINE === "1";
const { createClient } = require("@supabase/supabase-js");
const profile = { userId: "user-a", email: "fixture@example.invalid", permissionCodes: [], employee: { id: "employee-a", organizationId: "org-a", employeeCode: "FIX001", firstName: "Fixture", lastName: "Employee" } };
const now = "2026-11-09T12:00:00.000Z";
function load(path, replacements) {
  const filename = require.resolve(path);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (name) => replacements[name] ?? require(name);
  loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
function fixture(t, options = {}) {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(now) });
  t.mock.method(console, "warn", () => {});
  t.mock.method(console, "info", () => {});
  let row = options.row ? structuredClone(options.row) : null;
  const calls = [], events = [];
  const services = load("../../src/lib/manager/services/manager-self-attendance-service.ts", {
    "@/lib/audit/services/audit-service": { writeApplicationAudit: async (_, data) => events.push({ kind: "audit", data }) },
    "@/lib/attendance/late-warning-delivery": { scheduleLateCheckInWarning: (data) => events.push({ kind: "late-warning", data }) },
    "@/lib/attendance/services/attendance-notifications": Object.fromEntries(["notifyAttendanceCheckedIn", "notifyAttendanceCheckedOut", "notifyAttendanceCheckoutUpdated", "notifyAttendanceRegularizationRequested"].map(name => [name, async (...args) => events.push({ kind: name, args: args.slice(2) })])),
  });
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, ORIGIN);
    const call = { table: url.pathname.split("/").pop(), method: init.method ?? "GET", params: url.searchParams, body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    call.started = performance.now();
    if (options.beforeResponse) await options.beforeResponse(call);
    if (options.failTables?.includes(call.table)) return new Response(JSON.stringify({ message: `${call.table} unavailable`, code: "P0001" }), { status: 400, headers: { "content-type": "application/json" } });
    let data;
    if (call.table === "employees") data = [{ id: profile.employee.id, employee_code: "FIX001", first_name: "Fixture", last_name: "Employee", employment_status: options.inactive ? "inactive" : "active", account_status: "active", date_of_joining: "2026-01-01", email: "fixture@example.invalid", phone: null }];
    else if (call.table === "organization_settings") data = [{ settings: {} }];
    else if (call.table === "employee_profiles") data = [];
    else if (["holidays", "attendance_corrections", "leave_requests"].includes(call.table)) data = [];
    else if (call.table === "attendance") {
      if (call.method === "PATCH") {
        events.push({ kind: "attendance-update", data: call.body });
        row = { ...row, ...call.body };
      }
      const filters = call.params.getAll("attendance_date");
      data = row && filters.every(filter => filter.startsWith("eq.") ? row.attendance_date === filter.slice(3) : filter.startsWith("gte.") ? row.attendance_date >= filter.slice(4) : filter.startsWith("lte.") ? row.attendance_date <= filter.slice(4) : true) ? [row] : [];
    } else if (call.table === "self_service_attendance_punch") {
      events.push({ kind: "punch-rpc", data: call.body });
      const b = call.body;
      const type = b.p_type;
      row = { id: "attendance-a", attendance_date: "2026-11-09", check_in_at: null, check_out_at: null, prior_work_seconds: 0, ...row,
        [type === "in" ? "check_in_at" : "check_out_at"]: now,
        attendance_status: b.p_attendance_status, work_hours: b.p_work_hours, overtime_hours: b.p_overtime_hours, notes: b.p_notes,
        [`check_${type}_latitude`]: b.p_latitude, [`check_${type}_longitude`]: b.p_longitude };
      data = { ...row, employee_id: options.mismatched ? "other-employee" : profile.employee.id, location_saved: b.p_latitude !== null, action: options.race ? "already_checked_in" : type === "in" ? "checked_in" : "checked_out" };
    } else throw new Error(`Unexpected request: ${call.table}`);
    return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
  });
  const supabase = createClient(ORIGIN, "fixture-key", { auth: { persistSession: false, autoRefreshToken: false } });
  return { services, supabase, calls, events };
}
const openRow = { id: "attendance-a", attendance_date: "2026-11-09", check_in_at: "2026-11-09T03:30:00.000Z", check_out_at: null, attendance_status: "present", work_hours: 0, overtime_hours: 0, prior_work_seconds: 0, notes: null };

test("attendance page reuses today's row from the current month, but fetches today when viewing a historical month", async (t) => {
  const f = fixture(t, { row: openRow });
  const current = await f.services.getManagerProfilePageData(f.supabase, profile, { month: 11, year: 2026, page: 1, pageSize: 31 });
  assert.equal(current.today.checkInAt, openRow.check_in_at);
  const currentReads = f.calls.filter(c => c.table === "attendance");
  assert.equal(currentReads.length, baseline ? 2 : 1);
  f.calls.length = 0;
  const historical = await f.services.getManagerProfilePageData(f.supabase, profile, { month: 10, year: 2026, page: 1, pageSize: 31 });
  assert.deepEqual(historical.today, current.today);
  assert.equal(f.calls.filter(c => c.table === "attendance").length, 2);
  assert.ok(f.calls.every(c => c.method === "GET"));
});

test("attendance preflight reads overlap without moving validation or writes", async (t) => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const f = fixture(t, { beforeResponse: async c => { if (c.table === "organization_settings") await pending; } });
  const result = f.services.punchManagerAttendance(f.supabase, profile, { type: "in" });
  await new Promise(resolve => setImmediate(resolve));
  const attendanceStarted = f.calls.some(c => c.table === "attendance");
  const writesBeforeValidation = f.events.length;
  release();
  await result;
  assert.equal(attendanceStarted, !baseline);
  assert.equal(writesBeforeValidation, 0);
  assert.equal(f.events.find(e => e.kind === "punch-rpc").data.p_expected_employee_id, profile.employee.id);
});

test("preflight retains rules-first error precedence and never writes on validation failure", async (t) => {
  const f = fixture(t, { failTables: ["organization_settings", "attendance"] });
  await assert.rejects(f.services.punchManagerAttendance(f.supabase, profile, { type: "in" }), /organization_settings unavailable/);
  assert.equal(f.events.length, 0);
});

for (const kind of ["in", "out"]) {
  test(`${kind} punch preserves GPS precision, server/RPC time source, and audit/notification ordering`, async (t) => {
    const f = fixture(t, { row: kind === "out" ? openRow : null, beforeResponse: async () => { if (process.env.HRMS_PUNCH_TIMING_OUTPUT) await new Promise(resolve => setTimeout(resolve, 20)); } });
    const gps = { latitude: 17.123456789, longitude: 78.987654321, accuracy: 22.25 };
    const start = performance.now();
    const result = await f.services.punchManagerAttendance(f.supabase, profile, { type: kind, ...gps });
    if (process.env.HRMS_PUNCH_TIMING_OUTPUT) require("node:fs").appendFileSync(process.env.HRMS_PUNCH_TIMING_OUTPUT, JSON.stringify({ kind, ms: Math.round(performance.now()-start), calls: f.calls.map(c => ({table:c.table,method:c.method,startMs:Math.round(c.started-start)})) })+"\n");
    const rpc = f.events.find(e => e.kind === "punch-rpc");
    assert.equal(rpc.data.p_latitude, gps.latitude);
    assert.equal(rpc.data.p_longitude, gps.longitude);
    assert.equal(rpc.data.p_accuracy_m, gps.accuracy);
    assert.ok(!Object.keys(rpc.data).some(key => /timestamp|check_in_at|check_out_at/.test(key)));
    assert.equal(kind === "in" ? result.checkInAt : result.checkOutAt, now);
    assert.equal(kind === "in" ? result.hasCheckInLocation : result.hasCheckOutLocation, true);
    const auditIndex = f.events.findIndex(e => e.kind === "audit");
    const notificationIndex = f.events.findIndex(e => e.kind === (kind === "in" ? "notifyAttendanceCheckedIn" : "notifyAttendanceCheckedOut"));
    assert.ok(auditIndex > 0 && notificationIndex > auditIndex);
    if (kind === "out") {
      assert.equal(f.events.find(e => e.kind === "attendance-update").data.work_hours, 8.5);
      assert.equal(f.events.find(e => e.kind === "attendance-update").data.prior_work_seconds, 30600);
    }
  });
}

test("inactive employees and duplicate open punches remain rejected before any write", async (t) => {
  await t.test("inactive employee", async s => {
    const f = fixture(s, { inactive: true });
    await assert.rejects(f.services.punchManagerAttendance(f.supabase, profile, { type: "in" }), /not in the active workforce/);
    assert.equal(f.calls.length, 1);
    assert.equal(f.events.length, 0);
  });
  await t.test("duplicate punch", async s => {
    const f = fixture(s, { row: openRow });
    await assert.rejects(f.services.punchManagerAttendance(f.supabase, profile, { type: "in" }), /already checked in/);
    assert.equal(f.events.length, 0);
  });
});

test("a concurrent punch remains idempotent and a mismatched RPC employee is rejected", async (t) => {
  await t.test("concurrent punch", async s => {
    const f = fixture(s, { race: true });
    await f.services.punchManagerAttendance(f.supabase, profile, { type: "in" });
    assert.deepEqual(f.events.map(e => e.kind), ["punch-rpc"]);
  });
  await t.test("wrong employee", async s => {
    const f = fixture(s, { mismatched: true });
    await assert.rejects(f.services.punchManagerAttendance(f.supabase, profile, { type: "in" }), /your employee profile/);
    assert.deepEqual(f.events.map(e => e.kind), ["punch-rpc"]);
  });
});

test("required payroll refresh still finishes before revalidation and the attendance success response", async () => {
  const events = [];
  let release, settled = false;
  const pending = new Promise(resolve => { release = resolve; });
  const { selfAttendancePunchAction } = load("../../src/lib/attendance/actions/self-attendance-punch-actions.ts", {
    "@/lib/permissions/server": { requireServerAnyPermission: async () => profile },
    "@/lib/supabase/server": { createClient: async () => ({}) },
    "@/lib/manager/services/manager-self-attendance-service": { punchManagerAttendance: async () => { events.push("punch"); return { attendanceDate: "2026-11-09" }; } },
    "@/lib/payroll/services/payroll-mutations": { refreshDraftPayrollItemsForEmployee: async () => { events.push("payroll-start"); await pending; events.push("payroll-end"); } },
    "@/lib/attendance/self-attendance-revalidate": { revalidatePersonalAttendanceDashboardPaths: () => events.push("attendance-revalidate") },
    "@/lib/payroll/revalidate-open-payroll": { revalidateOpenPayrollPaths: () => events.push("payroll-revalidate") },
  });
  const result = selfAttendancePunchAction({ type: "out" }).then(value => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  assert.deepEqual(events, ["punch", "payroll-start"]);
  release();
  assert.equal((await result).success, true);
  assert.deepEqual(events, ["punch", "payroll-start", "payroll-end", "attendance-revalidate", "payroll-revalidate"]);
});
