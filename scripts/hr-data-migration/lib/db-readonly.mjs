import { createClient } from "@supabase/supabase-js";

const ORG_HINT = "a0000000-0000-4000-8000-000000000001";

function adminClient(url, key) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchAll(supabase, schema, table, select, { eq = {}, inFilters = {}, gte = {}, lte = {}, isNull = [] } = {}) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let query = supabase.schema(schema).from(table).select(select).range(from, from + pageSize - 1);
    for (const [key, value] of Object.entries(eq)) {
      query = query.eq(key, value);
    }
    for (const [key, value] of Object.entries(inFilters)) {
      if (value.length) query = query.in(key, value);
    }
    for (const [key, value] of Object.entries(gte)) {
      query = query.gte(key, value);
    }
    for (const [key, value] of Object.entries(lte)) {
      query = query.lte(key, value);
    }
    for (const key of isNull) {
      query = query.is(key, null);
    }
    const { data, error } = await query;
    if (error) throw new Error(`${schema}.${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

/**
 * Read-only snapshot for dry-run conflict detection.
 * NEVER writes. Bank account numbers stay in memory only for equality checks.
 */
export async function loadDbSnapshot(url, key, { employeeCodes, dateFrom, dateTo, payrollMonths }) {
  const supabase = adminClient(url, key);

  const employees = await fetchAll(
    supabase,
    "hrms",
    "employees",
    "id, organization_id, employee_code, first_name, last_name, email, employment_status, deleted_at",
    { isNull: ["deleted_at"] },
  );

  const byCode = new Map();
  const byEmail = new Map();
  const byId = new Map();
  for (const e of employees) {
    byCode.set(String(e.employee_code).trim().toUpperCase(), e);
    if (e.email) byEmail.set(String(e.email).toLowerCase(), e);
    byId.set(e.id, e);
  }

  const matchedIds = employeeCodes
    .map((code) => byCode.get(code)?.id)
    .filter(Boolean);

  let attendance = [];
  if (dateFrom && dateTo) {
    attendance = await fetchAll(
      supabase,
      "hrms",
      "attendance",
      "id, employee_id, attendance_date, attendance_status, notes, deleted_at",
      {
        isNull: ["deleted_at"],
        gte: { attendance_date: dateFrom },
        lte: { attendance_date: dateTo },
      },
    );
  }

  const bankAccounts = await fetchAll(
    supabase,
    "hrms",
    "bank_accounts",
    "id, employee_id, account_number, ifsc_code, is_primary, deleted_at",
    { isNull: ["deleted_at"] },
  );

  const payrolls = await fetchAll(
    supabase,
    "hrms",
    "payrolls",
    "id, organization_id, payroll_month, payroll_status, total_net, is_locked, deleted_at",
    { isNull: ["deleted_at"] },
  );

  const relevantPayrolls = payrolls.filter((p) =>
    payrollMonths.includes(String(p.payroll_month).slice(0, 10)),
  );

  let payrollItems = [];
  if (relevantPayrolls.length) {
    payrollItems = await fetchAll(
      supabase,
      "hrms",
      "payroll_items",
      "id, payroll_id, employee_id, gross_salary, net_salary, total_deductions, breakdown, deleted_at",
      {
        isNull: ["deleted_at"],
        inFilters: { payroll_id: relevantPayrolls.map((p) => p.id) },
      },
    );
  }

  let payslips = [];
  if (payrollItems.length) {
    payslips = await fetchAll(
      supabase,
      "hrms",
      "payslips",
      "id, payroll_id, payroll_item_id, employee_id, payslip_number, is_current, deleted_at",
      {
        isNull: ["deleted_at"],
        inFilters: { payroll_item_id: payrollItems.map((i) => i.id) },
      },
    );
  }

  const leaveRequests = await fetchAll(
    supabase,
    "hrms",
    "leave_requests",
    "id, employee_id, start_date, end_date, leave_status, deleted_at, leave_type_id",
    {
      isNull: ["deleted_at"],
      lte: { start_date: dateTo },
      gte: { end_date: dateFrom },
    },
  );

  return {
    orgHint: ORG_HINT,
    employees,
    employeesByCode: byCode,
    employeesByEmail: byEmail,
    employeesById: byId,
    matchedEmployeeIds: matchedIds,
    attendance,
    bankAccounts,
    payrolls: relevantPayrolls,
    allPayrolls: payrolls,
    payrollItems,
    payslips,
    leaveRequests,
  };
}
