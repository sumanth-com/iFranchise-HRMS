/* eslint-disable @typescript-eslint/no-require-imports -- Isolated composition fixtures; no database or network access. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
require("tsx/cjs");

function fixture(permissionCodes, fail = false) {
  const calls = [];
  const client = {};
  const profile = { permissionCodes, employee: { id: "employee-fixture", organizationId: "org-fixture", employeeCode: "FIX01", firstName: "Fixture", lastName: "Employee" } };
  const data = {
    balances: [{ leaveTypeCode: "CL", balanceDays: 7.5 }],
    requests: [{ id: "leave-fixture", leaveStatus: "pending" }],
    calendar: { leaves: [{ id: "leave-fixture" }], holidays: [{ id: "holiday-fixture" }], calendar: { holidays: ["2027-01-01"] } },
    lookups: { leaveTypes: [{ id: "cl", code: "CL" }] },
  };
  const queries = {};
  for (const [name, result] of Object.entries({ getEmployeeLeaveBalanceSnapshot: data.balances, listEmployeeOwnLeaveRequests: data.requests, getEmployeeLeaveCalendarData: data.calendar, getLeaveLookups: data.lookups, ensurePendingHrLeaveAssignedToCeo: undefined })) {
    queries[name] = async (...args) => { calls.push({ name, args }); if (fail && name !== "ensurePendingHrLeaveAssignedToCeo") throw Error("fixture read unavailable"); return result; };
  }
  const filename = require.resolve("../../src/lib/dashboard/self-service/attendance-leave-data.ts");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (name) => name === "@/lib/leave/services/leave-queries" ? queries : require(name);
  loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return { calls, client, profile, data, load: (portal) => loaded.exports.getAttendanceLeaveData(client, profile, portal, 1, 2027) };
}

test("attendance-only access performs no leave reads or routing writes", async () => {
  for (const portal of ["hr", "employee", "accountant", "manager"]) {
    const f = fixture(["attendance.view"]);
    assert.equal(await f.load(portal), null);
    assert.deepEqual(f.calls, []);
  }
});

test("combined page uses the authenticated employee and one shared month/year for the original reads", async () => {
  const f = fixture(["portal.employee.access", "leave.create", "leave.cancel"]);
  const result = await f.load("employee");
  assert.equal(f.calls.length, 4);
  assert.deepEqual(f.calls.find((c) => c.name === "listEmployeeOwnLeaveRequests").args, [f.client, "employee-fixture", 1, 50, { month: 1, year: 2027 }]);
  assert.deepEqual(f.calls.find((c) => c.name === "getEmployeeLeaveCalendarData").args, [f.client, f.profile, 1, 2027]);
  assert.deepEqual(f.calls.find((c) => c.name === "getEmployeeLeaveBalanceSnapshot").args, [f.client, "employee-fixture", 2027, undefined, "org-fixture"]);
  assert.equal(f.calls.find((c) => c.name === "getLeaveLookups").args[2].selfApplicant.id, "employee-fixture");
  assert.equal(result.balances, f.data.balances);
  assert.equal(result.requests, f.data.requests);
  assert.equal(result.calendarLeaves, f.data.calendar.leaves);
  assert.equal(result.calendarHolidays, f.data.calendar.holidays);
  assert.equal(result.calendarMonth, 1);
  assert.equal(result.calendarYear, 2027);
  assert.equal(result.canApply, true);
  assert.equal(result.canEdit, true);
  assert.equal(result.canDelete, true);
});

test("view-only users retain view-only leave functionality", async () => {
  const f = fixture(["leave.view"]);
  const result = await f.load("employee");
  assert.equal(result.canApply, false);
  assert.equal(result.canEdit, false);
  assert.equal(result.canDelete, false);
  assert.equal(result.applyLeaveLookups, null);
  assert.equal(f.calls.length, 3);
});

test("edit-only and withdrawal permissions retain their existing lookup and action rules", async () => {
  for (const portal of ["employee", "accountant", "manager", "system"]) {
    const f = fixture(["leave.view", "leave.edit", "leave.withdraw"]);
    const result = await f.load(portal);
    assert.equal(result.canApply, false);
    assert.equal(result.canEdit, true);
    assert.equal(result.canDelete, true);
    assert.equal(Boolean(result.applyLeaveLookups), portal === "employee" || portal === "accountant");
  }
});

test("system and HR retain their existing lookup scope and routing synchronization", async () => {
  const system = fixture(["leave.create"]);
  await system.load("system");
  assert.equal(system.calls.find((c) => c.name === "getLeaveLookups").args[2], undefined);
  assert.equal(system.calls.find((c) => c.name === "getEmployeeLeaveBalanceSnapshot").args[4], undefined);
  const hr = fixture(["leave.view", "leave.create"]);
  await hr.load("hr");
  assert.deepEqual(hr.calls.find((c) => c.name === "ensurePendingHrLeaveAssignedToCeo").args, ["org-fixture"]);
  assert.equal(hr.calls.find((c) => c.name === "getLeaveLookups").args[2].selfApplicant.id, "employee-fixture");
  assert.ok(!system.calls.some((c) => c.name === "ensurePendingHrLeaveAssignedToCeo"));
});

test("failed leave reads retain empty-data fallbacks without changing action permissions", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const portal of ["employee", "hr"]) {
    const f = fixture(["leave.view", "leave.create"], true);
    const result = await f.load(portal);
    assert.deepEqual(result.balances, []);
    assert.deepEqual(result.requests, []);
    assert.deepEqual(result.calendarLeaves, []);
    assert.deepEqual(result.calendarHolidays, []);
    assert.equal(result.canApply, true);
    if (portal === "hr") assert.equal(result.applyLeaveLookups, null);
    else assert.deepEqual(result.applyLeaveLookups.leaveTypes, []);
  }
});
