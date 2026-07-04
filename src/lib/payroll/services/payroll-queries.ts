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
  getMonthDateRange,
  getPayrollMonthDate,
} from "@/lib/payroll/services/payroll-utils";
import {
  getBranches,
  getDepartments,
} from "@/lib/employees/services/employee-queries";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getPayrollLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<PayrollLookups> {
  const [employeesResult, departments, branches] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, first_name, last_name, employee_code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .in("employment_status", ["active", "probation", "on_leave"])
      .order("first_name"),
    getDepartments(supabase, organizationId),
    getBranches(supabase, organizationId),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);

  const employees = (employeesResult.data ?? []).map((row) => ({
    id: row.id,
    label: `${row.first_name} ${row.last_name}`.trim(),
    code: row.employee_code,
  }));

  return { employees, departments, branches };
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
  let itemCounts: Record<string, number> = {};

  if (payrollIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .schema("hrms")
      .from("payroll_items")
      .select("payroll_id")
      .in("payroll_id", payrollIds)
      .is("deleted_at", null);

    if (itemsError) throw new Error(itemsError.message);

    itemCounts = (items ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.payroll_id] = (acc[row.payroll_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      payrollMonth: row.payroll_month,
      payrollStatus: row.payroll_status,
      totalGross: Number(row.total_gross),
      totalDeductions: Number(row.total_deductions),
      totalNet: Number(row.total_net),
      employeeCount: itemCounts[row.id] ?? 0,
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
  if (currentPayroll?.id) {
    const { count } = await supabase
      .schema("hrms")
      .from("payroll_items")
      .select("id", { count: "exact", head: true })
      .eq("payroll_id", currentPayroll.id)
      .is("deleted_at", null);
    employeesProcessed = count ?? 0;
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

  const { data: paidPayrolls } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("total_net")
    .eq("organization_id", organizationId)
    .eq("payroll_status", "paid")
    .is("deleted_at", null);

  const totalPayroll = (paidPayrolls ?? []).reduce(
    (sum, row) => sum + Number(row.total_net),
    0,
  );

  return {
    totalPayroll,
    employeesProcessed,
    pendingPayroll: pendingCount ?? 0,
    grossPayroll: currentPayroll ? Number(currentPayroll.total_gross) : 0,
    totalDeductions: currentPayroll ? Number(currentPayroll.total_deductions) : 0,
    netPayroll: currentPayroll ? Number(currentPayroll.total_net) : 0,
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
        employees!inner (
          employee_code,
          first_name,
          last_name,
          organization_id
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
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const organizationId = profile.employee.organizationId;

  let query = supabase
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
          departments:department_id (name)
        )
      `,
      { count: "exact" },
    )
    .eq("employees.organization_id", organizationId)
    .is("deleted_at", null);

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  if (search) {
    query = query.or(
      `employees.first_name.ilike.%${search}%,employees.last_name.ilike.%${search}%,employees.employee_code.ilike.%${search}%`,
    );
  }

  query = query.order("effective_from", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const today = new Date().toISOString().slice(0, 10);

  return {
    data: (data ?? []).map((row) => {
      const employee = unwrapRelation(row.employees);
      const department = employee
        ? unwrapRelation(
            employee.departments as { name: string } | { name: string }[] | null,
          )
        : null;
      const isCurrent =
        row.effective_from <= today &&
        (!row.effective_to || row.effective_to >= today);
      const components = (row.components as Record<string, number>) ?? {};
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        departmentName: department?.name ?? null,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
        currencyCode: row.currency_code,
        basicSalary: Number(row.basic_salary),
        hraAmount: Number(row.hra_amount),
        transportAllowance: Number(row.transport_allowance),
        otherAllowances: Number(row.other_allowances),
        grossSalary: Number(row.gross_salary),
        netSalary: Number(row.net_salary),
        taxDeduction: Number(row.tax_deduction),
        otherDeductions: Number(row.other_deductions),
        components: {
          specialAllowance: components.specialAllowance ?? 0,
          medical: components.medical ?? 0,
          pf: components.pf ?? 0,
          esi: components.esi ?? 0,
          professionalTax: components.professionalTax ?? 0,
          incomeTax: components.incomeTax ?? 0,
          other: components.other ?? 0,
        },
        isCurrent,
      };
    }),
    total: count ?? 0,
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
  },
): Promise<BonusListResult> {
  const parsed = bonusListParamsSchema.parse(params);
  const { page, pageSize, search, month, year, bonusStatus, bonusType, employeeId } =
    parsed;
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
        created_at,
        employees:employee_id!inner (
          employee_code,
          first_name,
          last_name
        )
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (employeeId) query = query.eq("employee_id", employeeId);
  if (bonusStatus) query = query.eq("bonus_status", bonusStatus);
  if (bonusType) query = query.eq("bonus_type", bonusType);
  if (month && year) {
    query = query.eq("bonus_month", getPayrollMonthDate(month, year));
  }

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
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        bonusType: row.bonus_type,
        amount: Number(row.amount),
        bonusMonth: row.bonus_month,
        bonusStatus: row.bonus_status,
        reason: row.reason,
        createdAt: row.created_at,
      };
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
          last_name
        )
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
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
    data: (data ?? []).map((row) => {
      const employee = unwrapRelation(row.employees);
      return {
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
      };
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
          last_name
        ),
        approver:approver_employee_id (
          first_name,
          last_name
        )
      `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
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
