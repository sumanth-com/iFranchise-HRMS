import { addMonths, format, subMonths } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import {
  formatPayrollMonthLabel,
  getPayrollMonthDate,
} from "@/lib/payroll/services/payroll-utils";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { ceoPayrollListParamsSchema } from "@/lib/validations/ceo-payroll";
import type { UserProfile } from "@/types/auth";
import type { PayrollBreakdown, PayrollStatus } from "@/types/payroll";
import type {
  CeoPayrollAnalytics,
  CeoPayrollDepartmentRow,
  CeoPayrollEmployeeDetail,
  CeoPayrollEmployeeListResult,
  CeoPayrollFilterLookups,
  CeoPayrollHistoryRow,
  CeoPayrollInsights,
  CeoPayrollKpis,
  CeoPayrollListParams,
  CeoPayrollOverview,
  CeoPayrollPageData,
} from "@/types/ceo-payroll";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  return unwrapRelation(value as T | T[] | null);
}

function parseParams(params: CeoPayrollListParams) {
  const now = new Date();
  const parsed = ceoPayrollListParamsSchema.parse(params);
  return {
    ...parsed,
    month: parsed.month ?? now.getMonth() + 1,
    year: parsed.year ?? now.getFullYear(),
  };
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function breakdownAmount(
  breakdown: PayrollBreakdown | null | undefined,
  codes: string[],
  type?: "earning" | "deduction",
) {
  if (!breakdown) return 0;
  const lines = [
    ...(breakdown.earnings ?? []),
    ...(breakdown.deductions ?? []),
  ].filter((line) => {
    if (!codes.includes(line.code)) return false;
    if (type && line.type !== type) return false;
    return true;
  });
  return sum(lines.map((line) => Number(line.amount ?? 0)));
}

function bonusFromBreakdown(breakdown: PayrollBreakdown | null | undefined) {
  if (!breakdown?.earnings) return 0;
  return sum(
    breakdown.earnings
      .filter((line) => line.code.startsWith("bonus") || line.code === "incentive")
      .map((line) => Number(line.amount ?? 0)),
  );
}

function incentiveFromBreakdown(breakdown: PayrollBreakdown | null | undefined) {
  if (!breakdown?.earnings) return 0;
  return sum(
    breakdown.earnings
      .filter((line) => line.code === "incentive" || line.code === "ot" || line.code === "overtime")
      .map((line) => Number(line.amount ?? 0)),
  );
}

export async function getCeoPayrollFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoPayrollFilterLookups> {
  const [employeesRes, departments, employmentTypes] = await Promise.all([
    fromHrms(supabase, "employees")
      .select("id, first_name, last_name, employee_code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("first_name"),
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "employment_types")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (departments.error) throw new Error(departments.error.message);
  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (employmentTypes.error) throw new Error(employmentTypes.error.message);

  return {
    employees: ((employeesRes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: `${row.first_name} ${row.last_name} · ${row.employee_code}`,
    })),
    departments: ((departments.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    employmentTypes: ((employmentTypes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
  };
}

async function getMonthPayroll(
  supabase: AuthSupabaseClient,
  organizationId: string,
  month: number,
  year: number,
) {
  const payrollMonth = getPayrollMonthDate(month, year);
  const { data, error } = await fromHrms(supabase, "payrolls")
    .select(
      "id, payroll_month, payroll_status, total_gross, total_deductions, total_net, processed_at, approved_at, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("payroll_month", payrollMonth)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as LooseRow | null;
}

async function loadPayrollItems(
  supabase: AuthSupabaseClient,
  organizationId: string,
  payrollId: string,
  filters: ReturnType<typeof parseParams>,
) {
  const query = fromHrms(supabase, "payroll_items")
    .select(
      `id, payroll_id, employee_id, basic_salary, total_allowances, total_deductions,
      gross_salary, net_salary, breakdown, created_at,
      employees:employee_id!inner(
        id, employee_code, first_name, last_name, email, department_id, designation_id,
        employment_type_id, employment_status,
        departments:department_id(id, name),
        designations:designation_id(title),
        employee_profiles(profile_image_storage_path)
      )`,
    )
    .eq("payroll_id", payrollId)
    .is("deleted_at", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as LooseRow[];
  if (filters.departmentId) {
    rows = rows.filter((row) => unwrap(row.employees)?.department_id === filters.departmentId);
  }
  if (filters.employmentTypeId) {
    rows = rows.filter(
      (row) => unwrap(row.employees)?.employment_type_id === filters.employmentTypeId,
    );
  }
  if (filters.employeeId) {
    rows = rows.filter((row) => unwrap(row.employees)?.id === filters.employeeId);
  } else if (filters.search) {
    const term = filters.search.toLowerCase();
    rows = rows.filter((row) => {
      const employee = unwrap(row.employees);
      if (!employee) return false;
      const haystack = `${employee.employee_code} ${employee.first_name} ${employee.last_name}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  void organizationId;
  return rows;
}

export async function getCeoPayrollKpis(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPayrollListParams = {},
): Promise<CeoPayrollKpis> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const now = new Date();
  const currentMonth = getPayrollMonthDate(now.getMonth() + 1, now.getFullYear());
  const selectedMonth = getPayrollMonthDate(parsed.month, parsed.year);

  const [selectedPayroll, currentPayroll, yearPayrolls, pendingRes, bonusesRes, reimbursementsRes] =
    await Promise.all([
      getMonthPayroll(supabase, organizationId, parsed.month, parsed.year),
      fromHrms(supabase, "payrolls")
        .select("id, payroll_status, total_net, total_gross, total_deductions")
        .eq("organization_id", organizationId)
        .eq("payroll_month", currentMonth)
        .is("deleted_at", null)
        .maybeSingle(),
      fromHrms(supabase, "payrolls")
        .select("total_net, payroll_status")
        .eq("organization_id", organizationId)
        .gte("payroll_month", getPayrollMonthDate(1, parsed.year))
        .lte("payroll_month", getPayrollMonthDate(12, parsed.year))
        .is("deleted_at", null),
      fromHrms(supabase, "payrolls")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("payroll_status", ["draft", "processing", "processed"])
        .is("deleted_at", null),
      fromHrms(supabase, "employee_bonuses")
        .select("amount, bonus_status, employees:employee_id!inner(department_id, employment_type_id)")
        .eq("organization_id", organizationId)
        .eq("bonus_month", selectedMonth)
        .in("bonus_status", ["approved", "paid"])
        .is("deleted_at", null),
      fromHrms(supabase, "employee_reimbursements")
        .select(
          "amount, reimbursement_status, expense_date, employees:employee_id!inner(department_id, employment_type_id)",
        )
        .eq("organization_id", organizationId)
        .gte("expense_date", selectedMonth)
        .lte(
          "expense_date",
          format(new Date(parsed.year, parsed.month, 0), "yyyy-MM-dd"),
        )
        .in("reimbursement_status", ["approved", "paid"])
        .is("deleted_at", null),
    ]);

  if (currentPayroll.error) throw new Error(currentPayroll.error.message);
  if (yearPayrolls.error) throw new Error(yearPayrolls.error.message);
  if (pendingRes.error) throw new Error(pendingRes.error.message);
  if (bonusesRes.error) throw new Error(bonusesRes.error.message);
  if (reimbursementsRes.error) throw new Error(reimbursementsRes.error.message);

  let bonusRows = (bonusesRes.data ?? []) as LooseRow[];
  let reimbursementRows = (reimbursementsRes.data ?? []) as LooseRow[];
  if (parsed.departmentId) {
    bonusRows = bonusRows.filter(
      (row) => unwrap(row.employees)?.department_id === parsed.departmentId,
    );
    reimbursementRows = reimbursementRows.filter(
      (row) => unwrap(row.employees)?.department_id === parsed.departmentId,
    );
  }
  if (parsed.employmentTypeId) {
    bonusRows = bonusRows.filter(
      (row) => unwrap(row.employees)?.employment_type_id === parsed.employmentTypeId,
    );
    reimbursementRows = reimbursementRows.filter(
      (row) => unwrap(row.employees)?.employment_type_id === parsed.employmentTypeId,
    );
  }

  const yearRows = ((yearPayrolls.data ?? []) as LooseRow[]).filter((row) =>
    parsed.payrollStatus ? row.payroll_status === parsed.payrollStatus : true,
  );

  const selectedStatus = (selectedPayroll?.payroll_status as PayrollStatus | undefined) ?? null;
  let employeesPaid = 0;
  let averageEmployeeSalary = 0;
  if (selectedPayroll?.id) {
    const items = await loadPayrollItems(
      supabase,
      organizationId,
      selectedPayroll.id,
      parsed,
    );
    employeesPaid = items.length;
    averageEmployeeSalary = avg(items.map((row) => Number(row.net_salary ?? 0)));
  }

  const upcoming =
    selectedStatus && ["paid", "approved"].includes(selectedStatus)
      ? format(addMonths(new Date(parsed.year, parsed.month - 1, 1), 1), "yyyy-MM-dd")
      : selectedMonth;

  return {
    totalPayrollCost: sum(yearRows.map((row) => Number(row.total_net ?? 0))),
    currentMonthPayroll: Number((currentPayroll.data as LooseRow | null)?.total_net ?? 0),
    payrollProcessed: yearRows.filter((row) =>
      ["processed", "approved", "paid"].includes(row.payroll_status),
    ).length,
    pendingPayroll: pendingRes.count ?? 0,
    averageEmployeeSalary,
    benefitsCost: sum(reimbursementRows.map((row) => Number(row.amount ?? 0))),
    bonusCost: sum(bonusRows.map((row) => Number(row.amount ?? 0))),
    deductions: Number(selectedPayroll?.total_deductions ?? 0),
    upcomingPayrollDate: upcoming,
    payrollStatus: selectedStatus,
    payrollStatusLabel: selectedStatus
      ? PAYROLL_STATUS_LABELS[selectedStatus]
      : employeesPaid > 0
        ? "In Progress"
        : "Not Started",
  };
}

export async function getCeoPayrollOverview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPayrollListParams = {},
): Promise<CeoPayrollOverview> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const kpis = await getCeoPayrollKpis(supabase, profile, parsed);
  const selectedPayroll = await getMonthPayroll(
    supabase,
    organizationId,
    parsed.month,
    parsed.year,
  );

  const totalEmployeesResult = await supabase
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .neq("employment_status", "terminated");

  if (totalEmployeesResult.error) throw new Error(totalEmployeesResult.error.message);

  let paidCount = 0;
  if (selectedPayroll?.id) {
    const items = await loadPayrollItems(
      supabase,
      organizationId,
      selectedPayroll.id,
      parsed,
    );
    paidCount = items.length;
  }

  const totalSalaryExpense = Number(selectedPayroll?.total_gross ?? 0);
  const netPayroll = Number(selectedPayroll?.total_net ?? 0);

  return {
    monthlyLabel: formatPayrollMonthLabel(getPayrollMonthDate(parsed.month, parsed.year)),
    totalSalaryExpense,
    benefitsExpense: kpis.benefitsCost,
    bonusExpense: kpis.bonusCost,
    deductions: Number(selectedPayroll?.total_deductions ?? 0),
    netPayroll,
    payrollCompletionPercent: percent(paidCount, totalEmployeesResult.count ?? 0),
    monthlySummary: [
      { label: "Gross Salary", value: totalSalaryExpense },
      { label: "Benefits", value: kpis.benefitsCost },
      { label: "Bonuses", value: kpis.bonusCost },
      { label: "Deductions", value: Number(selectedPayroll?.total_deductions ?? 0) },
      { label: "Net Payroll", value: netPayroll },
    ],
  };
}

export async function listCeoPayrollEmployees(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoPayrollListParams,
): Promise<CeoPayrollEmployeeListResult> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;
  const selectedPayroll = await getMonthPayroll(
    supabase,
    organizationId,
    parsed.month,
    parsed.year,
  );

  if (!selectedPayroll?.id) {
    return { data: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
  }

  if (parsed.payrollStatus && selectedPayroll.payroll_status !== parsed.payrollStatus) {
    return { data: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
  }

  const items = await loadPayrollItems(
    supabase,
    organizationId,
    selectedPayroll.id,
    parsed,
  );

  const bonusMonth = getPayrollMonthDate(parsed.month, parsed.year);
  const employeeIds = items.map((row) => row.employee_id as string);
  const bonusByEmployee = new Map<string, number>();

  if (employeeIds.length > 0) {
    const { data: bonuses, error } = await fromHrms(supabase, "employee_bonuses")
      .select("employee_id, amount")
      .eq("organization_id", organizationId)
      .eq("bonus_month", bonusMonth)
      .in("bonus_status", ["approved", "paid"])
      .in("employee_id", employeeIds)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    for (const row of (bonuses ?? []) as LooseRow[]) {
      bonusByEmployee.set(
        row.employee_id,
        (bonusByEmployee.get(row.employee_id) ?? 0) + Number(row.amount ?? 0),
      );
    }
  }

  const mapped = items.map((row) => {
    const employee = unwrap(row.employees);
    const department = unwrap(employee?.departments);
    const designation = unwrap(employee?.designations);
    const breakdown = row.breakdown as PayrollBreakdown | null;
    const fromBreakdown = bonusFromBreakdown(breakdown);
    const bonuses = fromBreakdown || bonusByEmployee.get(row.employee_id) || 0;

    return {
      id: row.id as string,
      payrollItemId: row.id as string,
      employeeId: row.employee_id as string,
      employeeCode: employee?.employee_code ?? "—",
      firstName: employee?.first_name ?? "",
      lastName: employee?.last_name ?? "",
      fullName: employee
        ? formatEmployeeName(employee.first_name, employee.last_name)
        : "—",
      departmentName: department?.name ?? null,
      designationTitle: designation?.title ?? null,
      basicSalary: Number(row.basic_salary ?? 0),
      allowances: Number(row.total_allowances ?? 0),
      bonuses,
      deductions: Number(row.total_deductions ?? 0),
      netSalary: Number(row.net_salary ?? 0),
      payrollStatus: selectedPayroll.payroll_status as PayrollStatus,
      paymentDate:
        selectedPayroll.approved_at ??
        selectedPayroll.processed_at ??
        selectedPayroll.payroll_month,
    };
  });

  const total = mapped.length;
  const from = (parsed.page - 1) * parsed.pageSize;
  return {
    data: mapped.slice(from, from + parsed.pageSize),
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function getCeoPayrollAnalytics(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPayrollListParams = {},
): Promise<CeoPayrollAnalytics> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const months = Array.from({ length: 12 }, (_, index) =>
    subMonths(new Date(parsed.year, parsed.month - 1, 1), 11 - index),
  );

  const rangeStart = getPayrollMonthDate(
    months[0]!.getMonth() + 1,
    months[0]!.getFullYear(),
  );
  const rangeEnd = getPayrollMonthDate(parsed.month, parsed.year);

  const [payrollsRes, selectedPayroll, bonusesRes, reimbursementsRes] = await Promise.all([
    fromHrms(supabase, "payrolls")
      .select("id, payroll_month, total_net, total_gross")
      .eq("organization_id", organizationId)
      .gte("payroll_month", rangeStart)
      .lte("payroll_month", rangeEnd)
      .is("deleted_at", null)
      .order("payroll_month", { ascending: true }),
    getMonthPayroll(supabase, organizationId, parsed.month, parsed.year),
    fromHrms(supabase, "employee_bonuses")
      .select("amount, bonus_type, employees:employee_id!inner(department_id)")
      .eq("organization_id", organizationId)
      .eq("bonus_month", getPayrollMonthDate(parsed.month, parsed.year))
      .in("bonus_status", ["approved", "paid"])
      .is("deleted_at", null),
    fromHrms(supabase, "employee_reimbursements")
      .select(
        "amount, category, employees:employee_id!inner(department_id)",
      )
      .eq("organization_id", organizationId)
      .gte("expense_date", getPayrollMonthDate(parsed.month, parsed.year))
      .lte(
        "expense_date",
        format(new Date(parsed.year, parsed.month, 0), "yyyy-MM-dd"),
      )
      .in("reimbursement_status", ["approved", "paid"])
      .is("deleted_at", null),
  ]);

  if (payrollsRes.error) throw new Error(payrollsRes.error.message);
  if (bonusesRes.error) throw new Error(bonusesRes.error.message);
  if (reimbursementsRes.error) throw new Error(reimbursementsRes.error.message);

  const payrollRows = (payrollsRes.data ?? []) as LooseRow[];
  const netByMonth = new Map(
    payrollRows.map((row) => [String(row.payroll_month).slice(0, 7), Number(row.total_net ?? 0)]),
  );

  const monthlyTrend = months.map((date) => {
    const key = format(date, "yyyy-MM");
    return {
      label: format(date, "MMM yyyy"),
      value: netByMonth.get(key) ?? 0,
    };
  });

  const growth = monthlyTrend.map((item, index) => {
    if (index === 0) return { label: item.label, value: 0 };
    const prev = monthlyTrend[index - 1]?.value ?? 0;
    return {
      label: item.label,
      value: prev > 0 ? Math.round(((item.value - prev) / prev) * 100) : 0,
    };
  });

  let departmentCost: { label: string; value: number }[] = [];
  let averageSalaryByDepartment: { label: string; value: number }[] = [];
  let salaryDistribution: { label: string; value: number }[] = [];
  let costPerEmployee = 0;

  if (selectedPayroll?.id) {
    const items = await loadPayrollItems(
      supabase,
      organizationId,
      selectedPayroll.id,
      parsed,
    );
    const deptMap = new Map<string, number[]>();
    for (const row of items) {
      const dept = unwrap(unwrap(row.employees)?.departments)?.name ?? "Unassigned";
      const list = deptMap.get(dept) ?? [];
      list.push(Number(row.net_salary ?? 0));
      deptMap.set(dept, list);
    }
    departmentCost = [...deptMap.entries()]
      .map(([label, values]) => ({ label, value: sum(values) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    averageSalaryByDepartment = [...deptMap.entries()]
      .map(([label, values]) => ({ label, value: avg(values) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const buckets = [
      { label: "< ₹25k", min: 0, max: 25000 },
      { label: "₹25k–50k", min: 25000, max: 50000 },
      { label: "₹50k–1L", min: 50000, max: 100000 },
      { label: "₹1L–2L", min: 100000, max: 200000 },
      { label: "> ₹2L", min: 200000, max: Number.POSITIVE_INFINITY },
    ];
    salaryDistribution = buckets.map((bucket) => ({
      label: bucket.label,
      value: items.filter((row) => {
        const net = Number(row.net_salary ?? 0);
        return net >= bucket.min && net < bucket.max;
      }).length,
    }));
    costPerEmployee = avg(items.map((row) => Number(row.net_salary ?? 0)));
  }

  let bonusRows = (bonusesRes.data ?? []) as LooseRow[];
  let reimbursementRows = (reimbursementsRes.data ?? []) as LooseRow[];
  if (parsed.departmentId) {
    bonusRows = bonusRows.filter(
      (row) => unwrap(row.employees)?.department_id === parsed.departmentId,
    );
    reimbursementRows = reimbursementRows.filter(
      (row) => unwrap(row.employees)?.department_id === parsed.departmentId,
    );
  }

  const bonusDistributionMap = new Map<string, number>();
  for (const row of bonusRows) {
    const label = String(row.bonus_type ?? "other");
    bonusDistributionMap.set(label, (bonusDistributionMap.get(label) ?? 0) + Number(row.amount ?? 0));
  }

  const benefitsDistributionMap = new Map<string, number>();
  for (const row of reimbursementRows) {
    const label = String(row.category ?? "other");
    benefitsDistributionMap.set(
      label,
      (benefitsDistributionMap.get(label) ?? 0) + Number(row.amount ?? 0),
    );
  }

  const prevDate = subMonths(new Date(parsed.year, parsed.month - 1, 1), 1);
  const prevPayroll = await getMonthPayroll(
    supabase,
    organizationId,
    prevDate.getMonth() + 1,
    prevDate.getFullYear(),
  );

  return {
    monthlyTrend,
    departmentCost,
    salaryDistribution,
    benefitsDistribution: [...benefitsDistributionMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    bonusDistribution: [...bonusDistributionMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    payrollGrowth: growth,
    averageSalaryByDepartment,
    costPerEmployee,
    comparison: [
      {
        label: format(prevDate, "MMM yyyy"),
        value: Number(prevPayroll?.total_net ?? 0),
      },
      {
        label: format(new Date(parsed.year, parsed.month - 1, 1), "MMM yyyy"),
        value: Number(selectedPayroll?.total_net ?? 0),
      },
    ],
  };
}

export async function listCeoPayrollDepartments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPayrollListParams = {},
): Promise<CeoPayrollDepartmentRow[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);
  const selectedPayroll = await getMonthPayroll(
    supabase,
    organizationId,
    parsed.month,
    parsed.year,
  );

  const { data: departments, error } = await fromHrms(supabase, "departments")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw new Error(error.message);

  const bonusMonth = getPayrollMonthDate(parsed.month, parsed.year);
  const [bonusesRes, reimbursementsRes] = await Promise.all([
    fromHrms(supabase, "employee_bonuses")
      .select("amount, employees:employee_id!inner(department_id)")
      .eq("organization_id", organizationId)
      .eq("bonus_month", bonusMonth)
      .in("bonus_status", ["approved", "paid"])
      .is("deleted_at", null),
    fromHrms(supabase, "employee_reimbursements")
      .select("amount, employees:employee_id!inner(department_id)")
      .eq("organization_id", organizationId)
      .gte("expense_date", bonusMonth)
      .lte("expense_date", format(new Date(parsed.year, parsed.month, 0), "yyyy-MM-dd"))
      .in("reimbursement_status", ["approved", "paid"])
      .is("deleted_at", null),
  ]);

  if (bonusesRes.error) throw new Error(bonusesRes.error.message);
  if (reimbursementsRes.error) throw new Error(reimbursementsRes.error.message);

  const items = selectedPayroll?.id
    ? await loadPayrollItems(supabase, organizationId, selectedPayroll.id, parsed)
    : [];

  return ((departments.data ?? []) as LooseRow[])
    .filter((row) => !parsed.departmentId || row.id === parsed.departmentId)
    .map((row) => {
      const deptItems = items.filter(
        (item) => unwrap(unwrap(item.employees)?.departments)?.id === row.id
          || unwrap(item.employees)?.department_id === row.id,
      );
      const nets = deptItems.map((item) => Number(item.net_salary ?? 0));
      const benefitsCost = sum(
        ((reimbursementsRes.data ?? []) as LooseRow[])
          .filter((bonus) => unwrap(bonus.employees)?.department_id === row.id)
          .map((bonus) => Number(bonus.amount ?? 0)),
      );
      const bonusCost = sum(
        ((bonusesRes.data ?? []) as LooseRow[])
          .filter((bonus) => unwrap(bonus.employees)?.department_id === row.id)
          .map((bonus) => Number(bonus.amount ?? 0)),
      );

      return {
        id: row.id as string,
        name: row.name as string,
        employeeCount: deptItems.length,
        monthlyCost: sum(nets),
        averageSalary: avg(nets),
        benefitsCost,
        bonusCost,
        payrollStatus: (selectedPayroll?.payroll_status as PayrollStatus | undefined) ?? null,
      };
    })
    .filter((row) => row.employeeCount > 0 || row.bonusCost > 0 || row.benefitsCost > 0);
}

export async function listCeoPayrollHistory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPayrollListParams = {},
): Promise<CeoPayrollHistoryRow[]> {
  const organizationId = profile.employee.organizationId;
  const parsed = parseParams(filters);

  let query = fromHrms(supabase, "payrolls")
    .select(
      "id, payroll_month, payroll_status, total_net, processed_at, approved_at, created_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("payroll_month", { ascending: false })
    .limit(24);

  if (parsed.year) {
    query = query
      .gte("payroll_month", getPayrollMonthDate(1, parsed.year))
      .lte("payroll_month", getPayrollMonthDate(12, parsed.year));
  }
  if (parsed.payrollStatus) query = query.eq("payroll_status", parsed.payrollStatus);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LooseRow[];
  const payrollIds = rows.map((row) => row.id as string);
  const counts = new Map<string, number>();

  if (payrollIds.length > 0) {
    const { data: items, error: itemsError } = await fromHrms(supabase, "payroll_items")
      .select("payroll_id, employees:employee_id!inner(department_id, employment_type_id)")
      .in("payroll_id", payrollIds)
      .is("deleted_at", null);
    if (itemsError) throw new Error(itemsError.message);

    for (const item of (items ?? []) as LooseRow[]) {
      const employee = unwrap(item.employees);
      if (parsed.departmentId && employee?.department_id !== parsed.departmentId) continue;
      if (
        parsed.employmentTypeId &&
        employee?.employment_type_id !== parsed.employmentTypeId
      ) {
        continue;
      }
      counts.set(item.payroll_id, (counts.get(item.payroll_id) ?? 0) + 1);
    }
  }

  return rows.map((row) => {
    const date = new Date(row.payroll_month);
    return {
      id: row.id as string,
      payrollMonth: row.payroll_month as string,
      monthLabel: formatPayrollMonthLabel(row.payroll_month),
      payrollCost: Number(row.total_net ?? 0),
      employeesPaid: counts.get(row.id) ?? 0,
      completedDate: row.approved_at ?? row.processed_at ?? null,
      status: row.payroll_status as PayrollStatus,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  });
}

export async function getCeoPayrollInsights(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  filters: CeoPayrollListParams = {},
): Promise<CeoPayrollInsights> {
  const parsed = parseParams(filters);
  const [departments, analytics, kpis, revisionsRes, bonusesRes] = await Promise.all([
    listCeoPayrollDepartments(supabase, profile, parsed),
    getCeoPayrollAnalytics(supabase, profile, parsed),
    getCeoPayrollKpis(supabase, profile, parsed),
    fromHrms(supabase, "salary_revisions")
      .select("old_gross_salary, new_gross_salary, revision_status")
      .eq("organization_id", profile.employee.organizationId)
      .gte("effective_from", getPayrollMonthDate(1, parsed.year))
      .lte("effective_from", getPayrollMonthDate(12, parsed.year))
      .is("deleted_at", null),
    fromHrms(supabase, "employee_bonuses")
      .select("amount, bonus_status")
      .eq("organization_id", profile.employee.organizationId)
      .eq("bonus_month", getPayrollMonthDate(parsed.month, parsed.year))
      .is("deleted_at", null),
  ]);

  if (revisionsRes.error) throw new Error(revisionsRes.error.message);
  if (bonusesRes.error) throw new Error(bonusesRes.error.message);

  const sorted = [...departments].sort((a, b) => b.monthlyCost - a.monthlyCost);
  const highest = sorted[0] ?? null;
  const lowest = [...sorted].reverse().find((row) => row.monthlyCost > 0) ?? sorted.at(-1) ?? null;

  const prev = analytics.comparison[0]?.value ?? 0;
  const current = analytics.comparison[1]?.value ?? 0;
  const payrollGrowthPercent =
    prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : 0;

  const revisions = (revisionsRes.data ?? []) as LooseRow[];
  const applied = revisions.filter((row) =>
    ["approved", "applied"].includes(row.revision_status),
  );
  const increaseTotal = sum(
    applied.map(
      (row) => Number(row.new_gross_salary ?? 0) - Number(row.old_gross_salary ?? 0),
    ),
  );

  const bonuses = (bonusesRes.data ?? []) as LooseRow[];
  const costOptimizationInsights: string[] = [];
  if (payrollGrowthPercent > 10) {
    costOptimizationInsights.push(
      `Payroll grew ${payrollGrowthPercent}% versus last month — review overtime and bonus spend.`,
    );
  }
  if (kpis.pendingPayroll > 0) {
    costOptimizationInsights.push(
      `${kpis.pendingPayroll} payroll run(s) still pending completion.`,
    );
  }
  if (highest && lowest && highest.monthlyCost > lowest.monthlyCost * 3 && lowest.monthlyCost > 0) {
    costOptimizationInsights.push(
      `${highest.name} costs materially more than ${lowest.name}; validate headcount and allowances.`,
    );
  }
  if (costOptimizationInsights.length === 0) {
    costOptimizationInsights.push(
      "Payroll spend is within a stable range for the selected period.",
    );
  }

  return {
    highestPayrollDepartment: highest
      ? { label: highest.name, value: highest.monthlyCost }
      : null,
    lowestPayrollDepartment: lowest
      ? { label: lowest.name, value: lowest.monthlyCost }
      : null,
    payrollGrowthPercent,
    salaryIncreaseSummary: [
      { label: "Revisions This Year", value: applied.length },
      { label: "Net Gross Increase", value: Math.max(0, increaseTotal) },
      { label: "Pending Revisions", value: revisions.filter((row) => row.revision_status === "pending").length },
    ],
    bonusSummary: [
      {
        label: "Approved / Paid",
        value: sum(
          bonuses
            .filter((row) => ["approved", "paid"].includes(row.bonus_status))
            .map((row) => Number(row.amount ?? 0)),
        ),
      },
      {
        label: "Pending",
        value: sum(
          bonuses
            .filter((row) => row.bonus_status === "pending")
            .map((row) => Number(row.amount ?? 0)),
        ),
      },
      { label: "Bonus Count", value: bonuses.length },
    ],
    upcomingPayrollRun: kpis.upcomingPayrollDate,
    costOptimizationInsights,
  };
}

export async function getCeoPayrollEmployeeDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    employeeId: string;
    payrollItemId?: string;
    month?: number;
    year?: number;
  },
): Promise<CeoPayrollEmployeeDetail | null> {
  const organizationId = profile.employee.organizationId;
  const now = new Date();
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `id, employee_code, first_name, last_name, email,
      departments:department_id(name),
      designations:designation_id(title),
      employee_profiles(profile_image_storage_path)`,
    )
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) return null;

  const selectedPayroll = await getMonthPayroll(supabase, organizationId, month, year);

  let item: LooseRow | null = null;
  if (input.payrollItemId) {
    const { data, error } = await fromHrms(supabase, "payroll_items")
      .select("*")
      .eq("id", input.payrollItemId)
      .eq("employee_id", input.employeeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    item = data as LooseRow | null;
  } else if (selectedPayroll?.id) {
    const { data, error } = await fromHrms(supabase, "payroll_items")
      .select("*")
      .eq("payroll_id", selectedPayroll.id)
      .eq("employee_id", input.employeeId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    item = data as LooseRow | null;
  }

  const [historyRes, revisionsRes, bonusesRes, structureRes] = await Promise.all([
    fromHrms(supabase, "payroll_items")
      .select(
        `id, net_salary, created_at,
        payrolls:payroll_id(id, payroll_month, payroll_status, approved_at, processed_at)`,
      )
      .eq("employee_id", input.employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
    fromHrms(supabase, "salary_revisions")
      .select(
        "effective_from, old_gross_salary, new_gross_salary, revision_status, created_at",
      )
      .eq("organization_id", organizationId)
      .eq("employee_id", input.employeeId)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1),
    fromHrms(supabase, "employee_bonuses")
      .select("amount")
      .eq("organization_id", organizationId)
      .eq("employee_id", input.employeeId)
      .eq("bonus_month", getPayrollMonthDate(month, year))
      .in("bonus_status", ["approved", "paid"])
      .is("deleted_at", null),
    fromHrms(supabase, "salary_structures")
      .select(
        "basic_salary, hra_amount, transport_allowance, other_allowances, tax_deduction, other_deductions, net_salary, components, effective_from",
      )
      .eq("employee_id", input.employeeId)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (historyRes.error) throw new Error(historyRes.error.message);
  if (revisionsRes.error) throw new Error(revisionsRes.error.message);
  if (bonusesRes.error) throw new Error(bonusesRes.error.message);
  if (structureRes.error) throw new Error(structureRes.error.message);

  const breakdown = (item?.breakdown as PayrollBreakdown | null) ?? null;
  const structure = structureRes.data as LooseRow | null;
  const components = (structure?.components ?? {}) as Record<string, number>;

  const tax =
    breakdownAmount(breakdown, ["income_tax", "pt"], "deduction") ||
    Number(structure?.tax_deduction ?? 0) + Number(components.incomeTax ?? 0) +
      Number(components.professionalTax ?? 0);
  const pf =
    breakdownAmount(breakdown, ["pf"], "deduction") || Number(components.pf ?? 0);
  const esi =
    breakdownAmount(breakdown, ["esi"], "deduction") || Number(components.esi ?? 0);
  const bonuses =
    bonusFromBreakdown(breakdown) ||
    sum(((bonusesRes.data ?? []) as LooseRow[]).map((row) => Number(row.amount ?? 0)));
  const incentives = incentiveFromBreakdown(breakdown);

  const basicSalary = Number(item?.basic_salary ?? structure?.basic_salary ?? 0);
  const allowances = Number(
    item?.total_allowances ??
      Number(structure?.hra_amount ?? 0) +
        Number(structure?.transport_allowance ?? 0) +
        Number(structure?.other_allowances ?? 0) +
        Number(components.specialAllowance ?? 0) +
        Number(components.medical ?? 0),
  );
  const deductions = Number(
    item?.total_deductions ??
      Number(structure?.tax_deduction ?? 0) + Number(structure?.other_deductions ?? 0),
  );
  const netSalary = Number(item?.net_salary ?? structure?.net_salary ?? 0);

  const salaryBreakdown =
    breakdown
      ? [
          ...(breakdown.earnings ?? []).map((line) => ({
            label: line.label,
            amount: Number(line.amount ?? 0),
            type: "earning" as const,
          })),
          ...(breakdown.deductions ?? []).map((line) => ({
            label: line.label,
            amount: Number(line.amount ?? 0),
            type: "deduction" as const,
          })),
        ]
      : [
          { label: "Basic Salary", amount: basicSalary, type: "earning" as const },
          { label: "Allowances", amount: allowances, type: "earning" as const },
          { label: "Bonuses", amount: bonuses, type: "earning" as const },
          { label: "Deductions", amount: deductions, type: "deduction" as const },
        ];

  const department = unwrap(employee.departments);
  const designation = unwrap(employee.designations);
  const profileRow = unwrap(employee.employee_profiles);
  const latestRevision = ((revisionsRes.data ?? []) as LooseRow[])[0] ?? null;

  const paymentHistory = ((historyRes.data ?? []) as LooseRow[]).map((row) => {
    const payroll = unwrap(row.payrolls);
    return {
      id: row.id as string,
      monthLabel: payroll?.payroll_month
        ? formatPayrollMonthLabel(payroll.payroll_month)
        : "—",
      netSalary: Number(row.net_salary ?? 0),
      status: (payroll?.payroll_status as PayrollStatus) ?? "draft",
      paymentDate: payroll?.approved_at ?? payroll?.processed_at ?? null,
    };
  });

  const timeline = [
    ...paymentHistory.map((row) => ({
      id: `pay-${row.id}`,
      title: `Payroll · ${row.monthLabel}`,
      description: `${PAYROLL_STATUS_LABELS[row.status]} · Net ${row.netSalary}`,
      createdAt: row.paymentDate ?? new Date().toISOString(),
    })),
    ...(latestRevision
      ? [
          {
            id: "revision",
            title: "Salary revision",
            description: `${latestRevision.revision_status} · ${Number(latestRevision.old_gross_salary)} → ${Number(latestRevision.new_gross_salary)}`,
            createdAt: latestRevision.created_at ?? latestRevision.effective_from,
          },
        ]
      : []),
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return {
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    firstName: employee.first_name,
    lastName: employee.last_name,
    fullName: formatEmployeeName(employee.first_name, employee.last_name),
    email: employee.email,
    departmentName: department?.name ?? null,
    designationTitle: designation?.title ?? null,
    profileImagePath: profileRow?.profile_image_storage_path ?? null,
    payrollStatus: (selectedPayroll?.payroll_status as PayrollStatus | undefined) ?? null,
    paymentDate:
      selectedPayroll?.approved_at ??
      selectedPayroll?.processed_at ??
      selectedPayroll?.payroll_month ??
      null,
    basicSalary,
    allowances,
    bonuses,
    incentives,
    deductions,
    tax,
    pf,
    esi,
    netSalary,
    salaryBreakdown,
    paymentHistory,
    timeline,
    lastSalaryRevision: latestRevision
      ? {
          effectiveFrom: latestRevision.effective_from,
          oldGross: Number(latestRevision.old_gross_salary ?? 0),
          newGross: Number(latestRevision.new_gross_salary ?? 0),
          status: latestRevision.revision_status,
        }
      : null,
  };
}

export async function getCeoPayrollPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoPayrollListParams,
): Promise<CeoPayrollPageData> {
  const parsed = parseParams(params);
  const organizationId = profile.employee.organizationId;

  const [kpis, overview, employees, analytics, departments, history, insights, lookups] =
    await Promise.all([
      getCeoPayrollKpis(supabase, profile, parsed),
      getCeoPayrollOverview(supabase, profile, parsed),
      listCeoPayrollEmployees(supabase, profile, parsed),
      getCeoPayrollAnalytics(supabase, profile, parsed),
      listCeoPayrollDepartments(supabase, profile, parsed),
      listCeoPayrollHistory(supabase, profile, parsed),
      getCeoPayrollInsights(supabase, profile, parsed),
      getCeoPayrollFilterLookups(supabase, organizationId),
    ]);

  return {
    kpis,
    overview,
    employees,
    analytics,
    departments,
    history,
    insights,
    lookups,
  };
}
