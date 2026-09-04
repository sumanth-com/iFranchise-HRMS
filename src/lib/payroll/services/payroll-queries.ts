import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  BonusListResult,
  PayrollListParams,
  PayrollListResult,
  PayrollLookups,
  PayrollSummary,
  PayslipListResult,
  ReimbursementListResult,
  SalaryRevisionListResult,
  SalaryStructureItem,
  SalaryStructureListResult,
} from "@/types/payroll";
import {
  bonusListParamsSchema,
  payrollListParamsSchema,
  payslipListParamsSchema,
  reimbursementListParamsSchema,
  salaryRevisionListParamsSchema,
  salaryStructureListParamsSchema,
} from "@/lib/validations/payroll";
import {
  resolveSalaryBreakdownFromStructure,
} from "@/lib/payroll/salary-structure-breakdown";
import {
  getMonthDateRange,
  getPayrollMonthDate,
} from "@/lib/payroll/services/payroll-utils";
import {
  evaluatePayrollIntegrity,
  type PayrollIntegrityEmployee,
} from "@/lib/payroll/payroll-integrity";
import {
  paymentStatusLabel,
} from "@/lib/payroll/services/payslip-history-queries";
import {
  resolvePayslipAvailability,
  resolvePayslipSchedule,
} from "@/lib/payroll/services/payslip-publication";
import {
  getBranches,
  getOccupiedDepartments,
  getEmploymentTypes,
} from "@/lib/employees/services/employee-queries";
import {
  isExcludedFromTeamPayslips,
  isHiddenFromPeopleFilters,
} from "@/lib/employee/directory-listing";

function isHiddenPayrollDirectoryPerson(
  employeeCode: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  designationTitle: string | null | undefined,
) {
  return isExcludedFromTeamPayslips(employeeCode, {
    employeeCode,
    firstName,
    lastName,
    designationTitle,
  });
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function payrollIntegrityEmployeeFromJoin(
  employees:
    | {
        id?: string | null;
        employee_code?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        date_of_joining?: string | null;
        app_hidden_at?: string | null;
        deleted_at?: string | null;
        designations?: { title: string } | { title: string }[] | null;
      }
    | {
        id?: string | null;
        employee_code?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        date_of_joining?: string | null;
        app_hidden_at?: string | null;
        deleted_at?: string | null;
        designations?: { title: string } | { title: string }[] | null;
      }[]
    | null,
): PayrollIntegrityEmployee | null {
  const row = unwrapRelation(employees);
  if (!row) return null;
  const designation = unwrapRelation(row.designations ?? null);
  return {
    id: row.id,
    employee_code: row.employee_code,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    date_of_joining: row.date_of_joining,
    app_hidden_at: row.app_hidden_at,
    deleted_at: row.deleted_at,
    designationTitle: designation?.title ?? null,
  };
}

const PAYROLL_ITEM_INTEGRITY_SELECT = `
  payroll_id,
  employee_id,
  gross_salary,
  total_deductions,
  net_salary,
  employees (
    id,
    employee_code,
    first_name,
    last_name,
    email,
    date_of_joining,
    app_hidden_at,
    deleted_at,
    designations:designation_id (title)
  )
`;

type SalaryStructureEmployeeRow = {
  employee_code: string;
  first_name: string;
  last_name: string;
  organization_id: string;
  date_of_joining?: string | null;
  departments?: { name: string } | { name: string }[] | null;
  designations?: { title: string } | { title: string }[] | null;
  employment_type_id?: string | null;
  employment_types?: { name: string } | { name: string }[] | null;
};

type SalaryStructureDbRow = {
  id: string;
  employee_id: string;
  effective_from: string;
  effective_to: string | null;
  currency_code: string;
  basic_salary: number;
  hra_amount: number;
  transport_allowance: number;
  other_allowances: number;
  gross_salary: number;
  net_salary: number;
  tax_deduction: number;
  other_deductions: number;
  components: Record<string, number> | null;
  employees?: SalaryStructureEmployeeRow | SalaryStructureEmployeeRow[] | null;
};

function mapSalaryStructureRow(
  row: SalaryStructureDbRow,
  employee: SalaryStructureEmployeeRow | null,
  department: { name: string } | null,
  components: Record<string, number>,
  isCurrent: boolean,
): SalaryStructureItem {
  const split = resolveSalaryBreakdownFromStructure({
    gross_salary: row.gross_salary,
    basic_salary: row.basic_salary,
    hra_amount: row.hra_amount,
    transport_allowance: row.transport_allowance,
    other_allowances: row.other_allowances,
    components,
  });

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: employee?.employee_code ?? "",
    employeeName: employee ? `${employee.first_name} ${employee.last_name}` : "",
    departmentName: department?.name ?? null,
    designationTitle: employee
      ? unwrapRelation(employee.designations)?.title ?? null
      : null,
    employmentTypeName: employee
      ? unwrapRelation(employee.employment_types)?.name ?? null
      : null,
    employmentTypeId: employee?.employment_type_id ?? null,
    joiningDate: employee?.date_of_joining ?? null,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    currencyCode: row.currency_code,
    basicSalary: split.basic,
    hraAmount: split.hra,
    transportAllowance: split.lta,
    otherAllowances: 0,
    grossSalary: split.basic + split.hra + split.special + split.lta,
    netSalary: Number(row.net_salary),
    taxDeduction: Number(row.tax_deduction),
    otherDeductions: Number(row.other_deductions),
    components: {
      specialAllowance: split.special,
      medical: 0,
      pf: components.pf ?? 0,
      esi: components.esi ?? 0,
      professionalTax: components.professionalTax ?? 0,
      incomeTax: components.incomeTax ?? 0,
      other: components.other ?? 0,
    },
    isCurrent,
  };
}

export async function getSalaryStructureById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  structureId: string,
): Promise<SalaryStructureItem | null> {
  const organizationId = profile.employee.organizationId;
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select(
      `
        id,
        employee_id,
        effective_from,
        effective_to,
        currency_code,
        basic_salary,
        hra_amount,
        transport_allowance,
        other_allowances,
        gross_salary,
        net_salary,
        tax_deduction,
        other_deductions,
        components,
        employees!inner (
          employee_code,
          first_name,
          last_name,
          organization_id,
          date_of_joining,
          deleted_at,
          departments:department_id (name),
          designations:designation_id (title),
          employment_type_id,
          employment_types:employment_type_id (name)
        )
      `,
    )
    .eq("id", structureId)
    .eq("employees.organization_id", organizationId)
    .is("employees.deleted_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const employee = unwrapRelation(
    data.employees as SalaryStructureEmployeeRow | SalaryStructureEmployeeRow[] | null,
  );
  const department = employee
    ? unwrapRelation(
        employee.departments as { name: string } | { name: string }[] | null,
      )
    : null;
  const components = (data.components as Record<string, number>) ?? {};
  const isCurrent =
    data.effective_from <= today &&
    (!data.effective_to || data.effective_to >= today);

  return mapSalaryStructureRow(data, employee, department, components, isCurrent);
}

export async function getPayrollLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<PayrollLookups> {
  const [employeesResult, departments, branches, employmentTypes] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select(
        "id, first_name, last_name, employee_code, employment_type_id, designations:designation_id (title), employment_types:employment_type_id (name)",
      )
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"])
      .order("first_name")
      .limit(250),
    getOccupiedDepartments(supabase, organizationId),
    getBranches(supabase, organizationId),
    getEmploymentTypes(supabase, organizationId),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const employees = (employeesResult.data ?? [])
    .filter((row) => {
      const designation = unwrapRelation(
        row.designations as { title: string } | { title: string }[] | null,
      );
      return !isHiddenFromPeopleFilters(row.employee_code, {
        employeeCode: row.employee_code,
        firstName: row.first_name,
        lastName: row.last_name,
        designationTitle: designation?.title ?? null,
      });
    })
    .map((row) => ({
      id: row.id,
      label: `${row.first_name} ${row.last_name}`.trim(),
      code: row.employee_code,
      designationTitle: unwrapRelation(
        row.designations as { title: string } | { title: string }[] | null,
      )?.title ?? null,
      employmentTypeName: unwrapRelation(
        row.employment_types as { name: string } | { name: string }[] | null,
      )?.name ?? null,
      employmentTypeId: row.employment_type_id ?? null,
    }));

  return { employees, departments, branches, employmentTypes };
}

export async function listPayrollRuns(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: PayrollListParams,
): Promise<PayrollListResult> {
  const parsed = payrollListParamsSchema.parse(params);
  const { page, pageSize, search, sortBy, sortOrder, month, year, payrollStatus } =
    parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = supabase
    .schema("hrms")
    .from("payrolls")
    .select(
      "id, payroll_month, payroll_status, total_gross, total_deductions, total_net, is_locked, processed_at, approved_at, created_at",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (month && year) {
    query = query.eq("payroll_month", getPayrollMonthDate(month, year));
  } else if (year) {
    const start = getPayrollMonthDate(1, year);
    const end = getPayrollMonthDate(12, year);
    query = query.gte("payroll_month", start).lte("payroll_month", end);
  }

  if (payrollStatus) {
    query = query.eq("payroll_status", payrollStatus);
  }

  if (search) {
    query = query.ilike("notes", `%${search}%`);
  }

  query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const payrollIds = (data ?? []).map((row) => row.id);
  const totalsByPayroll: Record<
    string,
    { totalGross: number; totalDeductions: number; totalNet: number; employeeCount: number }
  > = {};

  if (payrollIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .schema("hrms")
      .from("payroll_items")
      .select(PAYROLL_ITEM_INTEGRITY_SELECT)
      .in("payroll_id", payrollIds)
      .is("deleted_at", null);

    if (itemsError) throw new Error(itemsError.message);

    const itemsByPayroll = new Map<string, NonNullable<typeof items>>();
    for (const item of items ?? []) {
      const list = itemsByPayroll.get(item.payroll_id) ?? [];
      itemsByPayroll.set(item.payroll_id, [...list, item]);
    }

    for (const row of data ?? []) {
      const monthDate = new Date(`${String(row.payroll_month).slice(0, 10)}T00:00:00.000Z`);
      const periodEnd = getMonthDateRange(
        monthDate.getUTCMonth() + 1,
        monthDate.getUTCFullYear(),
      ).endDate;
      const report = evaluatePayrollIntegrity({
        items: (itemsByPayroll.get(row.id) ?? []).map((item) => ({
          employeeId: String(item.employee_id),
          grossSalary: Number(item.gross_salary ?? 0),
          totalDeductions: Number(item.total_deductions ?? 0),
          netSalary: Number(item.net_salary ?? 0),
          employee: payrollIntegrityEmployeeFromJoin(
            item.employees as Parameters<typeof payrollIntegrityEmployeeFromJoin>[0],
          ),
        })),
        headerGross: Number(row.total_gross),
        headerDeductions: Number(row.total_deductions),
        headerNet: Number(row.total_net),
        periodEnd,
      });
      totalsByPayroll[row.id] = {
        totalGross: report.totals.totalGross,
        totalDeductions: report.totals.totalDeductions,
        totalNet: report.totals.totalNet,
        employeeCount: report.eligibleItems.length,
      };
    }
  }

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      payrollMonth: row.payroll_month,
      payrollStatus: row.payroll_status,
      totalGross: totalsByPayroll[row.id]?.totalGross ?? Number(row.total_gross),
      totalDeductions: totalsByPayroll[row.id]?.totalDeductions ?? Number(row.total_deductions),
      totalNet: totalsByPayroll[row.id]?.totalNet ?? Number(row.total_net),
      employeeCount: totalsByPayroll[row.id]?.employeeCount ?? 0,
      isLocked: Boolean(row.is_locked),
      processedAt: row.processed_at,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getPayrollSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month?: number,
  year?: number,
): Promise<PayrollSummary> {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();
  const organizationId = profile.employee.organizationId;
  const payrollMonth = getPayrollMonthDate(targetMonth, targetYear);

  const { data: currentPayroll } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, total_gross, total_deductions, total_net")
    .eq("organization_id", organizationId)
    .eq("payroll_month", payrollMonth)
    .is("deleted_at", null)
    .maybeSingle();

  let employeesProcessed = 0;
  let grossPayroll = currentPayroll ? Number(currentPayroll.total_gross) : 0;
  let totalDeductions = currentPayroll ? Number(currentPayroll.total_deductions) : 0;
  let netPayroll = currentPayroll ? Number(currentPayroll.total_net) : 0;
  if (currentPayroll?.id) {
    const { data: items, error: itemsError } = await supabase
      .schema("hrms")
      .from("payroll_items")
      .select(PAYROLL_ITEM_INTEGRITY_SELECT)
      .eq("payroll_id", currentPayroll.id)
      .is("deleted_at", null);
    if (itemsError) throw new Error(itemsError.message);
    const periodEnd = getMonthDateRange(targetMonth, targetYear).endDate;
    const report = evaluatePayrollIntegrity({
      items: (items ?? []).map((item) => ({
        employeeId: String(item.employee_id),
        grossSalary: Number(item.gross_salary ?? 0),
        totalDeductions: Number(item.total_deductions ?? 0),
        netSalary: Number(item.net_salary ?? 0),
        employee: payrollIntegrityEmployeeFromJoin(
          item.employees as Parameters<typeof payrollIntegrityEmployeeFromJoin>[0],
        ),
      })),
      headerGross: Number(currentPayroll.total_gross),
      headerDeductions: Number(currentPayroll.total_deductions),
      headerNet: Number(currentPayroll.total_net),
      periodEnd,
    });
    employeesProcessed = report.eligibleItems.length;
    grossPayroll = report.totals.totalGross;
    totalDeductions = report.totals.totalDeductions;
    netPayroll = report.totals.totalNet;
  }

  const { count: pendingCount } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("payroll_status", ["draft", "processing", "processed"])
    .is("deleted_at", null);

  const yearStart = getPayrollMonthDate(1, targetYear);
  const yearEnd = getPayrollMonthDate(12, targetYear);

  const { data: yearPayrolls } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("payroll_month, payroll_status, total_gross, total_net")
    .eq("organization_id", organizationId)
    .gte("payroll_month", yearStart)
    .lte("payroll_month", yearEnd)
    .is("deleted_at", null)
    .order("payroll_month", { ascending: true });

  const monthlyOverview = Array.from({ length: 12 }, (_, index) => {
    const m = index + 1;
    const monthDate = getPayrollMonthDate(m, targetYear);
    const payroll = (yearPayrolls ?? []).find((p) => p.payroll_month === monthDate);
    const label = new Date(targetYear, index, 1).toLocaleString("en-IN", {
      month: "short",
    });
    return {
      month: monthDate,
      label,
      gross: payroll ? Number(payroll.total_gross) : 0,
      net: payroll ? Number(payroll.total_net) : 0,
      status: payroll?.payroll_status ?? null,
    };
  });

  const totalPayroll = (yearPayrolls ?? []).reduce(
    (sum, row) => sum + Number(row.total_net),
    0,
  );

  return {
    totalPayroll,
    employeesProcessed,
    pendingPayroll: pendingCount ?? 0,
    grossPayroll,
    totalDeductions,
    netPayroll,
    monthlyOverview,
  };
}

export async function listPayslips(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: PayrollListParams,
): Promise<PayslipListResult> {
  const parsed = payslipListParamsSchema.parse(params);
  const { page, pageSize, search, month, year, employeeId } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = supabase
    .schema("hrms")
    .from("payslips")
    .select(
      `
        id,
        payslip_number,
        employee_id,
        issued_at,
        salary_credit_date,
        published_at,
        payslip_version,
        archived_at,
        employees!inner (
          employee_code,
          first_name,
          last_name,
          organization_id,
          deleted_at
        ),
        payroll_items:payroll_item_id (
          gross_salary,
          net_salary
        ),
        payrolls:payroll_id (
          payroll_month,
          payroll_status
        )
      `,
      { count: "exact" },
    )
    .eq("employees.organization_id", organizationId)
    .is("employees.deleted_at", null)
    .is("deleted_at", null);

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  if (month && year) {
    query = query.eq("payrolls.payroll_month", getPayrollMonthDate(month, year));
  }

  if (search) {
    query = query.or(
      `payslip_number.ilike.%${search}%,employees.first_name.ilike.%${search}%,employees.last_name.ilike.%${search}%,employees.employee_code.ilike.%${search}%`,
    );
  }

  query = query.order("issued_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map((row) => {
      const employee = unwrapRelation(row.employees);
      const payrollItem = unwrapRelation(row.payroll_items);
      const payroll = unwrapRelation(row.payrolls);
      const schedule = resolvePayslipSchedule(payroll?.payroll_month ?? "", {
        salaryCreditDate: row.salary_credit_date ?? undefined,
        publishedAt: row.published_at ?? undefined,
      });
      const access = resolvePayslipAvailability(
        schedule.publishedAt,
        profile.permissionCodes,
        new Date(),
        { employeeFacing: row.employee_id === profile.employee.id },
      );
      return {
        id: row.id,
        payslipNumber: row.payslip_number,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        payrollMonth: payroll?.payroll_month ?? "",
        grossSalary: Number(payrollItem?.gross_salary ?? 0),
        netSalary: Number(payrollItem?.net_salary ?? 0),
        payrollStatus: payroll?.payroll_status ?? "draft",
        issuedAt: row.issued_at,
        salaryCreditDate: schedule.salaryCreditDate,
        publishedAt: schedule.publishedAt,
        availability: access.availability,
        canEmployeeAccess: access.canEmployeeAccess,
        reviewMessage: access.reviewMessage,
        payslipVersion: row.payslip_version ?? "1.0",
        paymentStatus: paymentStatusLabel(
          payroll?.payroll_status ?? "draft",
          access.availability,
        ),
        isArchived: Boolean(row.archived_at),
        versionCount: 1,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listSalaryStructures(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: { page?: number; pageSize?: number; search?: string; employeeId?: string },
): Promise<SalaryStructureListResult> {
  const parsed = salaryStructureListParamsSchema.parse(params);
  const { page, pageSize, search, employeeId } = parsed;
  const organizationId = profile.employee.organizationId;

  // 1. Fetch active employees in organization
  let empQuery = supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        date_of_joining,
        department_id,
        departments:department_id (name),
        designations:designation_id (title),
        employment_type_id,
        employment_types:employment_type_id (name)
      `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", ["active", "probation", "on_leave"]);

  if (employeeId) {
    empQuery = empQuery.eq("id", employeeId);
  }

  if (search) {
    const term = `%${search}%`;
    empQuery = empQuery.or(
      `first_name.ilike.${term},last_name.ilike.${term},employee_code.ilike.${term}`,
    );
  }

  // 2. Fetch existing salary structures
  let salaryQuery = supabase
    .schema("hrms")
    .from("salary_structures")
    .select(
      `
        id,
        employee_id,
        effective_from,
        effective_to,
        currency_code,
        basic_salary,
        hra_amount,
        transport_allowance,
        other_allowances,
        gross_salary,
        net_salary,
        tax_deduction,
        other_deductions,
        components,
        employees!inner (
          employee_code,
          first_name,
          last_name,
          organization_id,
          date_of_joining,
          deleted_at,
          departments:department_id (name),
          designations:designation_id (title),
          employment_type_id,
          employment_types:employment_type_id (name)
        )
      `,
    )
    .eq("employees.organization_id", organizationId)
    .is("employees.deleted_at", null)
    .is("deleted_at", null)
    .order("effective_from", { ascending: false });

  if (employeeId) {
    salaryQuery = salaryQuery.eq("employee_id", employeeId);
  }

  if (search) {
    const term = `%${search}%`;
    salaryQuery = salaryQuery.or(
      `employees.first_name.ilike.${term},employees.last_name.ilike.${term},employees.employee_code.ilike.${term}`,
    );
  }

  const [empRes, salaryRes] = await Promise.all([empQuery, salaryQuery]);
  if (empRes.error) throw new Error(empRes.error.message);
  if (salaryRes.error) throw new Error(salaryRes.error.message);

  const today = new Date().toISOString().slice(0, 10);
  const existingRows = ((salaryRes.data ?? []) as SalaryStructureDbRow[]).filter((row) => {
    const employee = unwrapRelation(
      row.employees as SalaryStructureEmployeeRow | SalaryStructureEmployeeRow[] | null,
    );
    const designation = employee
      ? unwrapRelation(employee.designations as { title: string } | { title: string }[] | null)
      : null;
    return !isHiddenPayrollDirectoryPerson(
      employee?.employee_code,
      employee?.first_name,
      employee?.last_name,
      designation?.title,
    );
  });
  const existingEmployeeIds = new Set(existingRows.map((r) => r.employee_id));

  const items: SalaryStructureItem[] = existingRows.map((row) => {
    const employee = unwrapRelation(
      row.employees as SalaryStructureEmployeeRow | SalaryStructureEmployeeRow[] | null,
    );
    const department = employee
      ? unwrapRelation(
          employee.departments as { name: string } | { name: string }[] | null,
        )
      : null;
    const isCurrent =
      row.effective_from <= today &&
      (!row.effective_to || row.effective_to >= today);
    const components = (row.components as Record<string, number>) ?? {};
    return mapSalaryStructureRow(row, employee, department, components, isCurrent);
  });

  // For active employees without any configured salary structure, include them so all persons are displayed
  for (const emp of empRes.data ?? []) {
    const designation = unwrapRelation(
      emp.designations as { title: string } | { title: string }[] | null,
    );
    if (
      isHiddenPayrollDirectoryPerson(
        emp.employee_code,
        emp.first_name,
        emp.last_name,
        designation?.title,
      )
    ) {
      continue;
    }
    if (!existingEmployeeIds.has(emp.id)) {
      const department = unwrapRelation(
        emp.departments as { name: string } | { name: string }[] | null,
      );
      items.push({
        id: `not_set_${emp.id}`,
        employeeId: emp.id,
        employeeCode: emp.employee_code ?? "",
        employeeName: `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
        departmentName: department?.name ?? null,
        designationTitle:
          unwrapRelation(
            emp.designations as { title: string } | { title: string }[] | null,
          )?.title ?? null,
        employmentTypeName:
          unwrapRelation(
            emp.employment_types as { name: string } | { name: string }[] | null,
          )?.name ?? null,
        employmentTypeId: emp.employment_type_id ?? null,
        joiningDate: emp.date_of_joining ?? null,
        effectiveFrom: emp.date_of_joining ?? today,
        effectiveTo: null,
        currencyCode: "INR",
        basicSalary: 0,
        hraAmount: 0,
        transportAllowance: 0,
        otherAllowances: 0,
        grossSalary: 0,
        netSalary: 0,
        taxDeduction: 0,
        otherDeductions: 0,
        components: {},
        isCurrent: false,
      });
    }
  }

  // Sort items: Alphabetical by employee name
  items.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  const total = items.length;
  const from = (page - 1) * pageSize;
  const pageData = items.slice(from, from + pageSize);

  return {
    data: pageData,
    total,
    page,
    pageSize,
  };
}

export async function listBonuses(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    month?: number;
    year?: number;
    bonusStatus?: string;
    bonusType?: string;
    employeeId?: string;
    departmentId?: string;
  },
): Promise<BonusListResult> {
  const parsed = bonusListParamsSchema.parse(params);
  const {
    page,
    pageSize,
    search,
    month,
    year,
    bonusStatus,
    bonusType,
    employeeId,
    departmentId,
  } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = supabase
    .schema("hrms")
    .from("employee_bonuses")
    .select(
      `
        id,
        employee_id,
        bonus_type,
        amount,
        bonus_month,
        bonus_status,
        reason,
        remarks,
        attachment_path,
        created_at,
        employees:employee_id!inner (
          employee_code,
          first_name,
          last_name,
          department_id,
          deleted_at,
          departments:department_id (name)
        ),
        approver:approver_employee_id (
          first_name,
          last_name
        ),
        bonus_approvals (
          approval_level,
          approval_status
        )
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("employees.deleted_at", null)
    .is("deleted_at", null);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (departmentId) query = query.eq("employees.department_id", departmentId);
  if (bonusStatus) query = query.eq("bonus_status", bonusStatus);
  if (bonusType) query = query.eq("bonus_type", bonusType);
  if (month && year) {
    query = query.eq("bonus_month", getPayrollMonthDate(month, year));
  }

  if (search) {
    query = query.or(
      `reason.ilike.%${search}%,remarks.ilike.%${search}%,employees.first_name.ilike.%${search}%,employees.last_name.ilike.%${search}%,employees.employee_code.ilike.%${search}%`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).flatMap((row) => {
      const employee = unwrapRelation(row.employees);
      if (
        isHiddenPayrollDirectoryPerson(
          employee?.employee_code,
          employee?.first_name,
          employee?.last_name,
          null,
        )
      ) {
        return [];
      }
      const department = employee
        ? unwrapRelation(
            employee.departments as { name: string } | { name: string }[] | null,
          )
        : null;
      const approver = unwrapRelation(
        row.approver as
          | { first_name: string; last_name: string }
          | { first_name: string; last_name: string }[]
          | null,
      );
      const approvals = (row.bonus_approvals ?? []) as Array<{
        approval_level: number;
        approval_status: string;
      }>;
      const pendingApproval = approvals.find((item) => item.approval_status === "pending");

      return [{
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        departmentName: department?.name ?? null,
        bonusType: row.bonus_type,
        amount: Number(row.amount),
        bonusMonth: row.bonus_month,
        bonusStatus: row.bonus_status,
        reason: row.reason,
        remarks: row.remarks,
        attachmentPath: row.attachment_path,
        approverName: approver
          ? `${approver.first_name} ${approver.last_name}`
          : null,
        approvalLevel: pendingApproval?.approval_level ?? null,
        createdAt: row.created_at,
      }];
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listReimbursements(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    month?: number;
    year?: number;
    reimbursementStatus?: string;
    category?: string;
    employeeId?: string;
  },
): Promise<ReimbursementListResult> {
  const parsed = reimbursementListParamsSchema.parse(params);
  const {
    page,
    pageSize,
    search,
    month,
    year,
    reimbursementStatus,
    category,
    employeeId,
  } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .select(
      `
        id,
        employee_id,
        category,
        amount,
        expense_date,
        reimbursement_status,
        description,
        created_at,
        employees:employee_id!inner (
          employee_code,
          first_name,
          last_name,
          deleted_at
        )
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("employees.deleted_at", null)
    .is("deleted_at", null);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (reimbursementStatus) query = query.eq("reimbursement_status", reimbursementStatus);
  if (category) query = query.eq("category", category);

  if (month && year) {
    const range = getMonthDateRange(month, year);
    query = query
      .gte("expense_date", range.startDate)
      .lte("expense_date", range.endDate);
  }

  if (search) {
    query = query.or(
      `description.ilike.%${search}%,employees.first_name.ilike.%${search}%,employees.last_name.ilike.%${search}%`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).flatMap((row) => {
      const employee = unwrapRelation(row.employees);
      if (
        isHiddenPayrollDirectoryPerson(
          employee?.employee_code,
          employee?.first_name,
          employee?.last_name,
          null,
        )
      ) {
        return [];
      }
      return [
        {
          id: row.id,
          employeeId: row.employee_id,
          employeeCode: employee?.employee_code ?? "",
          employeeName: employee
            ? `${employee.first_name} ${employee.last_name}`
            : "",
          category: row.category,
          amount: Number(row.amount),
          expenseDate: row.expense_date,
          reimbursementStatus: row.reimbursement_status,
          description: row.description,
          createdAt: row.created_at,
        },
      ];
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listSalaryRevisions(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    revisionStatus?: string;
    employeeId?: string;
  },
): Promise<SalaryRevisionListResult> {
  const parsed = salaryRevisionListParamsSchema.parse(params);
  const { page, pageSize, search, revisionStatus, employeeId } = parsed;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = supabase
    .schema("hrms")
    .from("salary_revisions")
    .select(
      `
        id,
        employee_id,
        old_gross_salary,
        new_gross_salary,
        old_net_salary,
        new_net_salary,
        effective_from,
        revision_status,
        reason,
        approved_at,
        created_at,
        employees:employee_id!inner (
          employee_code,
          first_name,
          last_name,
          deleted_at
        ),
        approver:approver_employee_id (
          first_name,
          last_name
        )
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("employees.deleted_at", null)
    .is("deleted_at", null);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (revisionStatus) query = query.eq("revision_status", revisionStatus);

  if (search) {
    query = query.or(
      `reason.ilike.%${search}%,employees.first_name.ilike.%${search}%,employees.last_name.ilike.%${search}%`,
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map((row) => {
      const employee = unwrapRelation(row.employees);
      const approver = unwrapRelation(
        row.approver as
          | { first_name: string; last_name: string }
          | { first_name: string; last_name: string }[]
          | null,
      );
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        oldGrossSalary: Number(row.old_gross_salary),
        newGrossSalary: Number(row.new_gross_salary),
        oldNetSalary: Number(row.old_net_salary),
        newNetSalary: Number(row.new_net_salary),
        effectiveFrom: row.effective_from,
        revisionStatus: row.revision_status,
        reason: row.reason,
        approverName: approver
          ? `${approver.first_name} ${approver.last_name}`
          : null,
        approvedAt: row.approved_at,
        createdAt: row.created_at,
      };
    }),
    total: count ?? 0,
    page,
    pageSize,
  };
}
