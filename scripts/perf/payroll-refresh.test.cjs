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
    if (process.env.HRMS_PAYROLL_TIMING_OUTPUT) await new Promise(resolve => setTimeout(resolve, 20));
    const result = respond(request);
    return new Response(JSON.stringify(result.data ?? []), {
      status: result.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  return requests;
}

test("payroll refresh preserves all amounts, write order, lifecycle guards, and failures", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-09T04:30:00Z") });
  const { refreshDraftPayrollItemsForEmployee: optimized } = require("../../src/lib/payroll/services/payroll-mutations.ts");
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

  // Captured before this optimization with the real calculator and synthetic records.
  const expected = {
    "existing draft item": "e93da098d6b740e3ffcc60598d3c6bd98e17cd3686b025598ddec223ba2bcc6e",
    "new draft item": "39b3996be5db3a63e3ac268b12c1bbc26a96cba51400a5af4e465b8f54e673e1",
    "sent item": "6c02b964dbb67de4c65aadab104e9eeceff597fbe2685bdd661be7a56a5dc620",
    "locked item": "6c02b964dbb67de4c65aadab104e9eeceff597fbe2685bdd661be7a56a5dc620",
    "hidden employee": "6c02b964dbb67de4c65aadab104e9eeceff597fbe2685bdd661be7a56a5dc620",
    "no draft runs": "6c02b964dbb67de4c65aadab104e9eeceff597fbe2685bdd661be7a56a5dc620",
    "settings read failure": "c4539e6714eaf38a7c27d3967155b49e7bdfefcbabf8339510fdaf7a33c87c47",
    "item write failure": "7b50e68d7c4ef57d0f03463dadc0706486289690ac05ed0a8937dcbd6c73ddd5"
};
  const evidence = [];
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
    const start = performance.now();
    const after = await run(optimized);
    const ms = Math.round(performance.now() - start);
    if (scenario.failureTable) assert.ok(after.error, scenario.name);
    else assert.equal(after.error, null, scenario.name);
    const writes = after.trace.filter(({ method }) => method !== "GET");
    if (scenario.noWrites) assert.equal(writes.length, 0, scenario.name);
    if (!scenario.noWrites && !scenario.failureTable) {
      assert.deepEqual(writes.map(({ table, method }) => [table, method]), [
        ["payroll_items", scenario.newItem ? "POST" : "PATCH"], ["payrolls", "PATCH"],
      ], scenario.name);
      assert.ok(writes[0].body.gross_salary > 0, scenario.name);
    }
    const digest = require("node:crypto").createHash("sha256").update(JSON.stringify({error:after.error,writes})).digest("hex");
    assert.equal(digest, expected[scenario.name], scenario.name + " calculation/write/error regression");
    evidence.push({scenario:scenario.name,ms,requests:after.trace.length,digest,reads:after.trace.filter(r=>r.method==="GET").map(r=>r.table)});
  }
  if (process.env.HRMS_PAYROLL_TIMING_OUTPUT) require("node:fs").writeFileSync(process.env.HRMS_PAYROLL_TIMING_OUTPUT,JSON.stringify(evidence,null,2));
});
