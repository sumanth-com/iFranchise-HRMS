/**
 * Exercise the real service modules with an isolated Supabase HTTP fixture.
 * Run: node --import tsx --test scripts/perf/read-optimizations.test.cjs
 * No .env files, real sessions, or database connections are used.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- CJS is needed to exercise server modules with an isolated loader. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
require("tsx/cjs");

// Node tests exercise server modules outside Next's server-component loader.
const marker = require.resolve("server-only");
require.cache[marker] = { id: marker, filename: marker, loaded: true, exports: {} };

const FIXTURE_ORIGIN = "https://performance-fixture.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL = FIXTURE_ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-key";

const { createClient } = require("@supabase/supabase-js");
const queries = require("../../src/lib/employees/services/employee-queries.ts");
const { getPayrollSettings } = require("../../src/lib/payroll/services/payroll-settings.ts");

function client() {
  return createClient(FIXTURE_ORIGIN, "fixture-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function fixture(t, respond) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, FIXTURE_ORIGIN, "Tests must never reach a real service");
    const request = {
      table: url.pathname.split("/").pop(),
      method: init.method ?? "GET",
      params: url.searchParams,
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    requests.push(request);
    const result = respond(request);
    return new Response(JSON.stringify(result.data ?? []), {
      status: result.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  return requests;
}

const types = [
  { id: "t1", name: "Full time", code: "FULL_TIME" },
  { id: "t2", name: "Probation", code: "PROBATION" },
  { id: "t3", name: "Internship", code: "INTERNSHIP" },
  { id: "t4", name: "Contractor", code: "CONTRACT" },
];

test("employee list returns identical dialog options with one lookup instead of ten", async (t) => {
  const requests = fixture(t, ({ table }) => ({ data: table === "employment_types" ? types : [] }));
  const broad = await queries.getEmployeeLookups(client(), "org-a");
  assert.equal(requests.length, 10);
  requests.length = 0;

  const narrow = await queries.getEmployeeListLookups(client(), "org-a");
  assert.deepEqual(narrow.employmentTypes, broad.employmentTypes);
  assert.deepEqual(narrow.employmentTypes.map((type) => type.id), ["t1", "t2", "t3"]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].table, "employment_types");
  assert.equal(requests[0].params.get("organization_id"), "eq.org-a");
  assert.equal(requests[0].params.get("status"), "eq.active");
  assert.equal(requests[0].params.get("deleted_at"), "is.null");
});

test("employee list preserves employment-type query errors and empty results", async (t) => {
  let fail = true;
  fixture(t, () => fail
    ? { status: 403, data: { message: "permission denied for employment types", code: "42501" } }
    : { data: [] });
  await assert.rejects(queries.getEmployeeLookups(client(), "org-a"), /permission denied for employment types/);
  await assert.rejects(queries.getEmployeeListLookups(client(), "org-a"), /permission denied for employment types/);
  fail = false;
  assert.deepEqual(await queries.getEmployeeListLookups(client(), "org-a"), { employmentTypes: [] });
});

test("employee list never reuses lookup results across organizations or requests", async (t) => {
  let version = 1;
  const requests = fixture(t, ({ params }) => ({ data: [
    { id: `${params.get("organization_id")}-${version}`, name: "Full time", code: "FULL_TIME" },
  ] }));
  const first = await queries.getEmployeeListLookups(client(), "org-a");
  const other = await queries.getEmployeeListLookups(client(), "org-b");
  version = 2;
  const fresh = await queries.getEmployeeListLookups(client(), "org-a");
  assert.notDeepEqual(first, other);
  assert.notDeepEqual(first, fresh);
  assert.equal(requests.length, 3);
});

test("payroll calculation settings skip display reads without changing any calculation settings", async (t) => {
  const requests = fixture(t, ({ table }) => ({ data:
    table === "organization_settings" ? [{
      settings: { payroll: {
        leave_integration: { loss_of_pay_deduction: false },
        currency: "USD",
      } },
      payroll_cycle: "monthly", currency_code: "INR", fiscal_year_start_month: 4,
      created_by: "user-a", updated_by: "user-b",
    }] : table === "organizations" ? [{ name: "Fixture company", logo_storage_path: "org-a/logo.png" }]
      : [{ employees: { first_name: "Fixture", last_name: "User" } }],
  }));
  const full = await getPayrollSettings(client(), "org-a");
  assert.equal(requests.length, 4);
  assert.equal(full.settings.payslip.companyName, "Fixture company");
  assert.equal(full.audit.createdByName, "Fixture User");
  requests.length = 0;

  const calculation = await getPayrollSettings(client(), "org-a", { includeDisplayMetadata: false });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].table, "organization_settings");
  assert.equal(requests[0].params.get("organization_id"), "eq.org-a");
  const { payslip: fullPayslip, ...fullSettings } = full.settings;
  const { payslip: calculationPayslip, ...calculationSettings } = calculation.settings;
  assert.deepEqual(calculationSettings, fullSettings);
  assert.deepEqual(
    { ...calculationPayslip, companyName: undefined, companyLogoPath: undefined },
    { ...fullPayslip, companyName: undefined, companyLogoPath: undefined },
  );
  assert.equal(calculationSettings.leaveIntegration.lossOfPayDeduction, false);
});

test("payroll calculation settings preserve defaults and settings-read errors", async (t) => {
  let fail = false;
  fixture(t, () => fail ? { status: 403, data: { message: "settings denied", code: "42501" } } : { data: [] });
  const full = await getPayrollSettings(client(), "org-a");
  const calculation = await getPayrollSettings(client(), "org-a", { includeDisplayMetadata: false });
  assert.deepEqual(calculation.settings, full.settings);
  fail = true;
  await assert.rejects(getPayrollSettings(client(), "org-a"), /settings denied/);
  await assert.rejects(getPayrollSettings(client(), "org-a", { includeDisplayMetadata: false }), /settings denied/);
});

// Run the same refresh with the old full settings load and the optimized load.
// Everything else, including calculators, permissions, and persistence, is real.
function refreshWithFullSettings() {
  const Module = require("node:module");
  const { readFileSync } = require("node:fs");
  const ts = require("typescript");
  const filename = require.resolve("../../src/lib/payroll/services/payroll-mutations.ts");
  const baseline = new Module(filename, module);
  baseline.filename = filename;
  baseline.require = (specifier) => specifier === "@/lib/payroll/services/payroll-settings"
    ? { getPayrollSettings: (supabase, organizationId) => getPayrollSettings(supabase, organizationId) }
    : require(specifier);
  baseline._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return baseline.exports.refreshDraftPayrollItemsForEmployee;
}

test("payroll refresh preserves all amounts, write order, lifecycle guards, and failures", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-09T04:30:00Z") });
  const { refreshDraftPayrollItemsForEmployee: optimized } = require("../../src/lib/payroll/services/payroll-mutations.ts");
  const baseline = refreshWithFullSettings();
  const profile = { userId: "user-a", employee: { id: "employee-a", organizationId: "org-a" } };
  const employee = {
    id: "employee-a", organization_id: "org-a", employee_code: "FIX001",
    first_name: "Fixture", last_name: "Employee", email: "fixture@example.invalid",
    date_of_joining: "2026-01-01", employment_status: "active", app_hidden_at: null,
    deleted_at: null, designations: { title: "Developer" },
  };
  const payroll = {
    id: "payroll-a", payroll_month: "2026-11-01", payroll_status: "draft",
    is_locked: false, total_gross: 0, total_deductions: 0, total_net: 0, notes: null,
  };
  let scenario;
  let persistedItem;
  const requests = fixture(t, ({ table, method, params, body }) => {
    if (table === scenario.failureTable && (scenario.failureMethod ?? "GET") === method) {
      return { status: 400, data: { code: "P0001", message: "fixture persistence/read failure" } };
    }
    if (method !== "GET") {
      assert.ok(table === "payroll_items" || table === "payrolls", `Unexpected write to ${table}`);
      if (table === "payroll_items") persistedItem = body;
      return { data: [] };
    }
    switch (table) {
      case "employees": return { data: [{ ...employee, app_hidden_at: scenario.hidden ? "2026-01-01" : null }] };
      case "payrolls": return { data: scenario.noRuns ? [] : [payroll] };
      case "organization_settings": return { data: [{
        settings: { payroll: {
          leave_integration: { loss_of_pay_deduction: true, half_day_deduction: true },
          salary_components: { pf: true, esi: true, professional_tax: true, income_tax: true },
        } },
        payroll_cycle: "monthly", currency_code: "INR", fiscal_year_start_month: 4,
        created_by: "user-a", updated_by: "user-b",
      }] };
      case "organizations": return { data: [{ name: "Fixture company", logo_storage_path: "org-a/logo.png" }] };
      case "user_roles": return { data: [{ employees: { first_name: "Fixture", last_name: "User" } }] };
      case "holidays": return { data: [{ holiday_date: "2026-11-05", is_optional: false }] };
      case "leave_types": return { data: [] };
      case "salary_structures": return { data: [{
        id: "salary-a", employee_id: "employee-a", effective_from: "2026-01-01", effective_to: null,
        basic_salary: 15000, hra_amount: 7500, transport_allowance: 3000, other_allowances: 4500,
        tax_deduction: 200, other_deductions: 100, gross_salary: 30000, net_salary: 29700,
        components: { pf: 1800, esi: 150, professionalTax: 200, incomeTax: 100 },
      }] };
      case "attendance": return { data: ["present", "present", "half_day", "on_leave", "holiday", "present", "absent", "week_off", "present"].map((status, i) => ({
        attendance_date: `2026-11-${String(i + 1).padStart(2, "0")}`, attendance_status: status,
        organization_id: "org-a", overtime_hours: i === 1 ? 2 : 0, notes: null,
      })) };
      case "leave_requests": return { data: [{
        employee_id: "employee-a", start_date: "2026-11-04", end_date: "2026-11-04",
        total_days: 1, duration_breakdown: null, leave_types: { code: "CL", is_paid: true },
      }] };
      case "employee_bonuses": return { data: [{ amount: 500, bonus_type: "performance", bonus_month: "2026-11-01" }] };
      case "employee_reimbursements": return { data: [{
        id: "claim-a", employee_id: "employee-a", amount: 250, category: "travel", expense_date: "2026-11-03", payroll_id: null,
      }] };
      case "payroll_items": return { data: params.get("select") === "id,breakdown"
        ? scenario.newItem ? [] : [{ id: "item-a", breakdown: { payrollLifecycle: { itemStatus: scenario.itemStatus ?? "draft" } } }]
        : [{ id: "item-a", employee_id: employee.id, ...persistedItem, employees: employee }],
      };
      default: throw new Error(`Unconfigured fixture table: ${table}`);
    }
  });

  async function run(refresh) {
    requests.length = 0;
    persistedItem = undefined;
    let error = null;
    try { await refresh(client(), profile, employee.id); }
    catch (caught) { error = { name: caught.name, message: caught.message }; }
    return {
      error,
      trace: requests.map(({ params, ...request }) => ({ ...request, params: params.toString() })),
    };
  }

  for (scenario of [
    { name: "existing draft item" },
    { name: "new draft item", newItem: true },
    { name: "sent item", itemStatus: "sent", noWrites: true },
    { name: "locked item", itemStatus: "locked", noWrites: true },
    { name: "hidden employee", hidden: true, noWrites: true },
    { name: "no draft runs", noRuns: true, noWrites: true },
    { name: "settings read failure", failureTable: "organization_settings" },
    { name: "item write failure", failureTable: "payroll_items", failureMethod: "PATCH" },
  ]) {
    const before = await run(baseline);
    const after = await run(optimized);
    assert.deepEqual(after.error, before.error, scenario.name);
    if (scenario.failureTable) assert.ok(after.error, scenario.name);
    else assert.equal(after.error, null, scenario.name);
    assert.deepEqual(after.trace, before.trace.filter(({ table }) => !["organizations", "user_roles"].includes(table)), scenario.name);
    const writes = after.trace.filter(({ method }) => method !== "GET");
    if (scenario.noWrites) assert.equal(writes.length, 0, scenario.name);
    if (!scenario.noWrites && !scenario.failureTable) {
      assert.deepEqual(writes.map(({ table, method }) => [table, method]), [
        ["payroll_items", scenario.newItem ? "POST" : "PATCH"], ["payrolls", "PATCH"],
      ], scenario.name);
      assert.ok(writes[0].body.gross_salary > 0, scenario.name);
      assert.equal(before.trace.length - after.trace.length, 3, scenario.name);
    }
  }
});
