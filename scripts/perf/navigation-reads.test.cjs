/** Isolated regression fixtures: no real credentials, network, or database writes. */
/* eslint-disable @typescript-eslint/no-require-imports -- Tests load server modules outside Next and provide a scoped hook dependency. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
require("tsx/cjs");
const marker = require.resolve("server-only");
require.cache[marker] = { id: marker, filename: marker, loaded: true, exports: {} };
const ORIGIN = "https://navigation-fixture.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGIN;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-key";

const { createClient } = require("@supabase/supabase-js");
const { getPayrollSettings } = require("../../src/lib/payroll/services/payroll-settings.ts");
const { getEmployeePayrollData } = require("../../src/lib/employee/services/employee-payroll-queries.ts");
const employeeId = "00000000-0000-4000-8000-000000000001";
const profile = {
  userId: "fixture-user", permissionCodes: [], roles: [],
  employee: { id: employeeId, organizationId: "org-a", employeeCode: "FIX001", firstName: "Fixture", lastName: "Employee" },
};
function client() { return createClient(ORIGIN, "fixture-key", { auth: { persistSession: false, autoRefreshToken: false } }); }

function loadWithDependency(path, dependency, exports) {
  const filename = require.resolve(path);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (specifier) => specifier === dependency ? exports : require(specifier);
  loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return loaded.exports;
}

const rows = {
  employees: [{ employee_code: "FIX001", first_name: "Fixture", last_name: "Employee", designations: { title: "Developer" } }],
  organization_settings: [{
    settings: { payroll: { salary_credit_date: 3, financial_year_end_month: 3 } },
    currency_code: "INR", payroll_cycle: "monthly", fiscal_year_start_month: 4,
    created_by: "user-a", updated_by: "user-b",
  }],
  organizations: [{ name: "Fixture company", logo_storage_path: "org-a/logo.png" }],
  user_roles: [{ employees: { first_name: "Fixture", last_name: "User" } }],
  salary_structures: [{
    effective_from: "2026-01-01", effective_to: null, currency_code: "INR",
    basic_salary: 15000, hra_amount: 7500, transport_allowance: 3000, other_allowances: 4500,
    tax_deduction: 200, other_deductions: 100, gross_salary: 30000, net_salary: 29700,
    components: { pf: 1800, esi: 150, professionalTax: 200, incomeTax: 100 },
  }],
  bank_accounts: [{ id: "bank-a", bank_name: "Fixture bank", account_holder_name: "Fixture Employee", account_number: "00000000", ifsc_code: "ABCD0000001", branch_name: "Fixture Branch", account_type: "salary", is_primary: true }],
  payslips: [{
    id: "payslip-a", payslip_number: "PS-202610-FIX001", employee_id: employeeId,
    payroll_id: "payroll-a", issued_at: "2026-11-02", salary_credit_date: "2026-11-02",
    published_at: "2026-11-05", email_sent_at: "2026-11-05T06:00:00Z", archived_at: null,
    payroll_items: { gross_salary: 30000, net_salary: 29700, total_deductions: 300, basic_salary: 15000, total_allowances: 15000, breakdown: null },
    payrolls: { payroll_month: "2026-10-01", payroll_status: "paid", created_at: "2026-11-01", processed_at: "2026-11-01", approved_at: "2026-11-02" },
  }],
  employee_bonuses: [], employee_reimbursements: [], performance_promotions: [],
};

function transport(t, respond) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, ORIGIN);
    assert.equal(init.method ?? "GET", "GET", "Reading a payroll page must not write data");
    const table = url.pathname.split("/").pop();
    assert.ok(table in rows, `Unexpected table ${table}`);
    requests.push({ table, params: url.searchParams.toString() });
    const reply = respond ? await respond(table) : { data: rows[table] };
    return new Response(JSON.stringify(reply.data), { status: reply.status ?? 200, headers: { "content-type": "application/json" } });
  });
  return requests;
}

test("payroll page returns identical published figures and options with 8 rather than 11 reads", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-09T04:30:00Z") });
  const requests = transport(t);
  const full = loadWithDependency("../../src/lib/employee/services/employee-payroll-queries.ts", "@/lib/payroll/services/payroll-settings", {
    getPayrollSettings: (supabase, organizationId) => getPayrollSettings(supabase, organizationId),
  }).getEmployeePayrollData;
  const before = await full(client(), profile);
  assert.equal(requests.length, 11);
  requests.length = 0;
  const after = await getEmployeePayrollData(client(), profile);
  assert.deepEqual(after, before);
  assert.equal(after.payslips[0].id, "payslip-a");
  assert.equal(after.payslips[0].netSalary, 29700);
  assert.equal(requests.length, 8);
  assert.ok(!requests.some(({ table }) => table === "organizations" || table === "user_roles"));
});

test("payroll reads start independently of employee metadata and retain its failure fallback", async (t) => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const errors = t.mock.method(console, "error", () => {});
  const requests = transport(t, async (table) => {
    if (table === "employees") {
      await pending;
      return { data: { message: "fixture metadata failure", code: "P0001" }, status: 400 };
    }
    return { data: rows[table] };
  });
  const result = getEmployeePayrollData(client(), profile);
  // Flush microtasks while the metadata HTTP response remains unresolved.
  await new Promise((resolve) => setImmediate(resolve));
  const started = requests.map(({ table }) => table);
  release();
  const data = await result;
  assert.equal(started.length, 8);
  assert.ok(started.includes("payslips") && started.includes("organization_settings"));
  assert.equal(data.payslips[0].employeeCode, profile.employee.employeeCode);
  assert.equal(errors.mock.callCount(), 1);
});

test("fresh server props win immediately over older module cache data", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { setModuleSoftCache, moduleSoftCacheKey, invalidateModuleSoftCache } = require("../../src/lib/perf/module-soft-cache.ts");
  const { useModuleSoftData } = loadWithDependency("../../src/lib/perf/use-module-soft-data.ts", "@/providers/auth-provider", { useAuth: () => ({ profile }) });
  const key = moduleSoftCacheKey("fixture", { organizationId: profile.employee.organizationId, employeeId });
  setModuleSoftCache(key, { value: "old value" });
  function View() {
    return React.createElement("span", null, useModuleSoftData({ value: "fresh value" }, { moduleId: "fixture" }).value);
  }
  try { assert.equal(renderToStaticMarkup(React.createElement(View)), "<span>fresh value</span>"); }
  finally { invalidateModuleSoftCache(key); }
});
