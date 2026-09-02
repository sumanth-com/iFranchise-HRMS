import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { isExcludedFromTeamPayslips } from "@/lib/employee/directory-listing";
import { LEAVE_BALANCE_CARD_CODES } from "@/lib/leave/constants";
import { getEmployeeLeaveBalanceSnapshot } from "@/lib/leave/services/leave-queries";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import { emitHrmsWebhook } from "@/lib/public-api/emit";
import { getPayslipBranding } from "@/lib/payroll/services/payslip-branding";
import { PayslipEmailError } from "@/lib/payroll/services/payslip-email-errors";
import { sendPayslipReadyEmail } from "@/lib/payroll/services/payslip-email-service";
import { storePayslipPdf } from "@/lib/payroll/services/payslip-storage";
import {
  buildEmployerContributions,
  parseStatutoryIds,
  totalEarnings,
} from "@/lib/payroll/services/payslip-document-helpers";
import {
  PAYSLIP_VERSION,
  canAccessPayslipDuringReview,
  computePayslipSchedule,
  isPayslipPublishedToEmployee,
  resolvePayslipAvailability,
  resolvePayslipSchedule,
} from "@/lib/payroll/services/payslip-publication";
import type { UserProfile } from "@/types/auth";
import type {
  PayrollBreakdown,
  PayrollDetail,
  PayrollPreviewResult,
  PayslipDetail,
  EmployeePayrollRunBreakdown,
} from "@/types/payroll";
import {
  calculateEmployeePayroll,
  type AttendanceSummary,
  type LeaveMonthSummary,
  type SalaryStructureRow,
} from "@/lib/payroll/services/payroll-calculator";
import {
  generatePayslipNumber,
  formatPayrollMonth,
  formatPayrollMonthLabel,
  getMonthDateRange,
  getPayrollMonthDate,
  maskAccountNumber,
  roundCurrency,
} from "@/lib/payroll/services/payroll-utils";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { getPayrollSettings } from "@/lib/payroll/services/payroll-settings";
import { notifyEmployee } from "@/lib/notifications/services/notification-service";
import type { PayrollRunInput } from "@/lib/validations/payroll";
import {
  salaryRevisionFormSchema,
  salaryStructureFormSchema,
} from "@/lib/validations/payroll";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function syncEmployeeEmploymentType(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  employmentTypeId: string | undefined,
) {
  if (!employmentTypeId) return;

  const { data: typeRow, error: typeError } = await supabase
    .schema("hrms")
    .from("employment_types")
    .select("id")
    .eq("id", employmentTypeId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (typeError) throw new Error(typeError.message);
  if (!typeRow) throw new Error("Select a valid employment type.");

  const { error } = await supabase
    .schema("hrms")
    .from("employees")
    .update({
      employment_type_id: employmentTypeId,
      updated_by: actorUserId(profile),
    })
    .eq("id", employeeId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

/** auth.users FK — cron / system actors must use null, not a fake string. */
function actorUserId(profile: UserProfile): string | null {
  const id = profile.userId?.trim();
  if (!id || id === "system-cron") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  )
    ? id
    : null;
}

async function getActiveEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        departments:department_id (name),
        designations:designation_id (title),
        employment_types:employment_type_id (name)
      `,
    )
    .eq("organization_id", organizationId)
    .in("employment_status", ["active", "probation", "on_leave"])
    .is("deleted_at", null)
    .order("employee_code", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).filter((row) => {
    const designation = unwrapRelation(
      row.designations as { title: string } | { title: string }[] | null,
    );
    return !isExcludedFromTeamPayslips(row.employee_code, {
      employeeCode: row.employee_code,
      firstName: row.first_name,
      lastName: row.last_name,
      designationTitle: designation?.title ?? null,
    });
  });
}

async function resolvePayslipSalaryComponents(
  supabase: AuthSupabaseClient,
  employeeId: string,
  payrollMonth: string,
  salaryStructureId: string | null | undefined,
  breakdown?: PayrollBreakdown | null,
): Promise<Record<string, unknown> | null> {
  const snapshotComponents = breakdown?.salaryStructureSnapshot?.components;
  if (snapshotComponents && typeof snapshotComponents === "object") {
    return snapshotComponents;
  }

  if (salaryStructureId) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("salary_structures")
      .select("components")
      .eq("id", salaryStructureId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data?.components) {
      return data.components as Record<string, unknown>;
    }
  }

  const monthDate = payrollMonth.slice(0, 10);
  const parsed = new Date(`${monthDate}T00:00:00.000Z`);
  const month = parsed.getUTCMonth() + 1;
  const year = parsed.getUTCFullYear();
  const structure = await getEffectiveSalaryStructure(supabase, employeeId, month, year);
  return (structure?.components as Record<string, unknown> | null) ?? null;
}

async function getEffectiveSalaryStructure(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
) {
  const { endDate } = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select("*")
    .eq("employee_id", employeeId)
    .lte("effective_from", endDate)
    .is("deleted_at", null)
    .or(`effective_to.is.null,effective_to.gte.${getPayrollMonthDate(month, year)}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function getAttendanceSummary(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
): Promise<AttendanceSummary> {
  const range = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select("attendance_status, overtime_hours")
    .eq("employee_id", employeeId)
    .gte("attendance_date", range.startDate)
    .lte("attendance_date", range.endDate)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const summary: AttendanceSummary = {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    onLeaveDays: 0,
    weekOffDays: 0,
    holidayDays: 0,
    overtimeHours: 0,
  };

  for (const row of data ?? []) {
    switch (row.attendance_status) {
      case "present":
      case "late":
        summary.presentDays += 1;
        break;
      case "absent":
        summary.absentDays += 1;
        break;
      case "half_day":
        summary.halfDays += 1;
        break;
      case "on_leave":
        summary.onLeaveDays += 1;
        break;
      case "week_off":
        summary.weekOffDays += 1;
        break;
      case "holiday":
        summary.holidayDays += 1;
        break;
      default:
        break;
    }
    summary.overtimeHours += Number(row.overtime_hours ?? 0);
  }

  return summary;
}

async function getLeaveMonthSummary(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
): Promise<LeaveMonthSummary> {
  const range = getMonthDateRange(month, year);
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("employee_id, total_days, duration_breakdown, leave_types!inner(code, is_paid)")
    .eq("employee_id", employeeId)
    .eq("leave_status", "approved")
    .lte("start_date", range.endDate)
    .gte("end_date", range.startDate)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return summarizeLeaveRows(data ?? []);
}

function summarizeLeaveRows(
  rows: Array<{
    total_days?: number | string | null;
    duration_breakdown?: { lopDays?: unknown; paidDays?: unknown } | null;
    leave_types?: { code?: string; is_paid?: boolean } | { code?: string; is_paid?: boolean }[] | null;
  }>,
): LeaveMonthSummary {
  return rows.reduce(
    (sum, row) => {
      const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
      const breakdown = row.duration_breakdown;
      const total = Number(row.total_days) || 0;
      if (leaveType?.is_paid === false) {
        return { lopDays: sum.lopDays + total, paidLeaveDays: sum.paidLeaveDays };
      }
      const lop =
        typeof breakdown?.lopDays === "number" ? breakdown.lopDays : 0;
      const paid =
        typeof breakdown?.paidDays === "number" ? breakdown.paidDays : Math.max(0, total - lop);
      return { lopDays: sum.lopDays + lop, paidLeaveDays: sum.paidLeaveDays + paid };
    },
    { lopDays: 0, paidLeaveDays: 0 },
  );
}

function toSalaryStructureRow(row: Record<string, unknown> | null): SalaryStructureRow | null {
  if (!row) return null;
  return {
    id: String(row.id),
    employee_id: String(row.employee_id),
    basic_salary: row.basic_salary as number | string,
    hra_amount: row.hra_amount as number | string,
    transport_allowance: row.transport_allowance as number | string,
    other_allowances: row.other_allowances as number | string,
    tax_deduction: row.tax_deduction as number | string,
    other_deductions: row.other_deductions as number | string,
    gross_salary: row.gross_salary as number | string,
    net_salary: row.net_salary as number | string,
    components: (row.components as Record<string, unknown> | null) ?? null,
  };
}

const QUERY_IN_CHUNK = 80;

function emptyAttendanceSummary(): AttendanceSummary {
  return {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    onLeaveDays: 0,
    weekOffDays: 0,
    holidayDays: 0,
    overtimeHours: 0,
  };
}

function applyAttendanceStatus(
  summary: AttendanceSummary,
  status: string | null | undefined,
  overtimeHours: number,
) {
  switch (status) {
    case "present":
    case "late":
      summary.presentDays += 1;
      break;
    case "absent":
      summary.absentDays += 1;
      break;
    case "half_day":
      summary.halfDays += 1;
      break;
    case "on_leave":
      summary.onLeaveDays += 1;
      break;
    case "week_off":
      summary.weekOffDays += 1;
      break;
    case "holiday":
      summary.holidayDays += 1;
      break;
    default:
      break;
  }
  summary.overtimeHours += overtimeHours;
}

async function loadPayrollPeriodFacts(
  supabase: AuthSupabaseClient,
  employeeIds: string[],
  month: number,
  year: number,
) {
  const structuresByEmployee = new Map<string, SalaryStructureRow>();
  const attendanceByEmployee = new Map<string, AttendanceSummary>();
  const leaveByEmployee = new Map<string, LeaveMonthSummary>();
  const bonusesByEmployee = new Map<string, Array<{ amount: number | string; bonus_type: string }>>();
  const reimbursementsByEmployee = new Map<
    string,
    Array<{ amount: number | string; category: string }>
  >();

  for (const id of employeeIds) {
    attendanceByEmployee.set(id, emptyAttendanceSummary());
    leaveByEmployee.set(id, { lopDays: 0, paidLeaveDays: 0 });
    bonusesByEmployee.set(id, []);
    reimbursementsByEmployee.set(id, []);
  }

  if (employeeIds.length === 0) {
    return {
      structuresByEmployee,
      attendanceByEmployee,
      leaveByEmployee,
      bonusesByEmployee,
      reimbursementsByEmployee,
    };
  }

  const range = getMonthDateRange(month, year);
  const monthDate = getPayrollMonthDate(month, year);
  const structureRank = new Map<string, string>();

  for (let i = 0; i < employeeIds.length; i += QUERY_IN_CHUNK) {
    const chunk = employeeIds.slice(i, i + QUERY_IN_CHUNK);

    const [
      structuresResult,
      attendanceResult,
      leaveResult,
      bonusesResult,
      reimbursementsResult,
    ] = await Promise.all([
      supabase
        .schema("hrms")
        .from("salary_structures")
        .select("*")
        .in("employee_id", chunk)
        .lte("effective_from", range.endDate)
        .is("deleted_at", null)
        .or(`effective_to.is.null,effective_to.gte.${monthDate}`),
      supabase
        .schema("hrms")
        .from("attendance")
        .select("employee_id, attendance_status, overtime_hours")
        .in("employee_id", chunk)
        .gte("attendance_date", range.startDate)
        .lte("attendance_date", range.endDate)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select(
          "employee_id, total_days, duration_breakdown, leave_types!inner(code, is_paid)",
        )
        .in("employee_id", chunk)
        .eq("leave_status", "approved")
        .lte("start_date", range.endDate)
        .gte("end_date", range.startDate)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("employee_bonuses")
        .select("employee_id, amount, bonus_type, bonus_month")
        .in("employee_id", chunk)
        .in("bonus_status", ["pending", "approved"])
        .eq("bonus_month", monthDate)
        .is("payroll_id", null)
        .is("deleted_at", null),
      supabase
        .schema("hrms")
        .from("employee_reimbursements")
        .select("employee_id, amount, category, expense_date")
        .in("employee_id", chunk)
        .in("reimbursement_status", ["pending", "approved"])
        .is("payroll_id", null)
        .is("deleted_at", null)
        .gte("expense_date", range.startDate)
        .lte("expense_date", range.endDate),
    ]);

    if (structuresResult.error) throw new Error(structuresResult.error.message);
    if (attendanceResult.error) throw new Error(attendanceResult.error.message);
    if (leaveResult.error) throw new Error(leaveResult.error.message);
    if (bonusesResult.error) throw new Error(bonusesResult.error.message);
    if (reimbursementsResult.error) throw new Error(reimbursementsResult.error.message);

    for (const row of structuresResult.data ?? []) {
      const employeeId = String(row.employee_id);
      const from = String(row.effective_from ?? "");
      const previous = structureRank.get(employeeId);
      if (!previous || from > previous) {
        structureRank.set(employeeId, from);
        const mapped = toSalaryStructureRow(row as Record<string, unknown>);
        if (mapped) structuresByEmployee.set(employeeId, mapped);
      }
    }

    for (const row of attendanceResult.data ?? []) {
      const summary = attendanceByEmployee.get(row.employee_id);
      if (!summary) continue;
      applyAttendanceStatus(summary, row.attendance_status, Number(row.overtime_hours ?? 0));
    }

    const leaveRowsByEmployee = new Map<
      string,
      Array<{
        total_days?: number | string | null;
        duration_breakdown?: { lopDays?: unknown; paidDays?: unknown } | null;
        leave_types?: { code?: string; is_paid?: boolean } | { code?: string; is_paid?: boolean }[] | null;
      }>
    >();
    for (const row of leaveResult.data ?? []) {
      const list = leaveRowsByEmployee.get(row.employee_id) ?? [];
      list.push(row);
      leaveRowsByEmployee.set(row.employee_id, list);
    }
    for (const [employeeId, rows] of leaveRowsByEmployee) {
      leaveByEmployee.set(employeeId, summarizeLeaveRows(rows));
    }

    for (const row of bonusesResult.data ?? []) {
      if (monthKey(row.bonus_month) !== monthKey(monthDate)) continue;
      bonusesByEmployee.get(row.employee_id)?.push({
        amount: row.amount,
        bonus_type: row.bonus_type,
      });
    }

    for (const row of reimbursementsResult.data ?? []) {
      reimbursementsByEmployee.get(row.employee_id)?.push({
        amount: row.amount,
        category: row.category,
      });
    }
  }

  return {
    structuresByEmployee,
    attendanceByEmployee,
    leaveByEmployee,
    bonusesByEmployee,
    reimbursementsByEmployee,
  };
}

function monthKey(value: string | null | undefined): string {
  return String(value ?? "").slice(0, 7);
}

async function getPayableBonuses(
  supabase: AuthSupabaseClient,
  employeeId: string,
  monthDates: string[],
  options?: { includeAttached?: boolean },
) {
  const dates = [...new Set(monthDates.filter(Boolean))];
  if (dates.length === 0) return [];
  const monthKeys = new Set(dates.map((date) => monthKey(date)));

  let query = supabase
    .schema("hrms")
    .from("employee_bonuses")
    .select("amount, bonus_type, bonus_month")
    .eq("employee_id", employeeId)
    .in("bonus_status", ["pending", "approved"])
    .in("bonus_month", dates)
    .is("deleted_at", null);

  if (!options?.includeAttached) {
    query = query.is("payroll_id", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).filter((row) => monthKeys.has(monthKey(row.bonus_month)));
}

async function getPayableReimbursements(
  supabase: AuthSupabaseClient,
  employeeId: string,
  ranges: Array<{ startDate: string; endDate: string }>,
  options?: { includeAttached?: boolean },
) {
  const uniqueRanges = ranges.filter(
    (range, index, all) =>
      all.findIndex(
        (item) => item.startDate === range.startDate && item.endDate === range.endDate,
      ) === index,
  );
  if (uniqueRanges.length === 0) return [];

  let query = supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .select("amount, category, expense_date")
    .eq("employee_id", employeeId)
    .in("reimbursement_status", ["pending", "approved"])
    .is("deleted_at", null);

  if (!options?.includeAttached) {
    query = query.is("payroll_id", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).filter((row) =>
    uniqueRanges.some(
      (range) => row.expense_date >= range.startDate && row.expense_date <= range.endDate,
    ),
  );
}

export async function buildPayrollPreview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: PayrollRunInput,
): Promise<PayrollPreviewResult> {
  const { month, year } = input;
  const organizationId = profile.employee.organizationId;
  const employees = await getActiveEmployees(supabase, organizationId);
  const payrollSettings = await getPayrollSettings(supabase, organizationId);
  const calcSettings = {
    workingDaysCalculation: payrollSettings.settings.workingDaysCalculation,
    lossOfPayDeduction: payrollSettings.settings.leaveIntegration.lossOfPayDeduction,
    halfDayDeduction: payrollSettings.settings.leaveIntegration.halfDayDeduction,
    paidLeaveDeduction: payrollSettings.settings.leaveIntegration.paidLeaveDeduction,
  };

  const facts = await loadPayrollPeriodFacts(
    supabase,
    employees.map((employee) => employee.id),
    month,
    year,
  );

  const items = employees.map((employee) => {
    const department = unwrapRelation(
      employee.departments as { name: string } | { name: string }[] | null,
    );
    const salaryStructure = facts.structuresByEmployee.get(employee.id) ?? null;
    const attendance = facts.attendanceByEmployee.get(employee.id) ?? emptyAttendanceSummary();
    const leaveSummary = facts.leaveByEmployee.get(employee.id) ?? {
      lopDays: 0,
      paidLeaveDays: 0,
    };
    const bonuses = facts.bonusesByEmployee.get(employee.id) ?? [];
    const reimbursements = facts.reimbursementsByEmployee.get(employee.id) ?? [];

    const calc = calculateEmployeePayroll({
      month,
      year,
      salaryStructure,
      attendance,
      leaveSummary,
      bonuses,
      reimbursements,
      settings: calcSettings,
    });

    const designation = unwrapRelation(
      employee.designations as { title: string } | { title: string }[] | null,
    );
    const employmentType = unwrapRelation(
      employee.employment_types as { name: string } | { name: string }[] | null,
    );

    return {
      employeeId: employee.id,
      employeeCode: employee.employee_code,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      departmentName: department?.name ?? null,
      designationTitle: designation?.title ?? null,
      employmentTypeName: employmentType?.name ?? null,
      salaryStructureId: salaryStructure?.id ?? null,
      hasSalaryStructure: Boolean(salaryStructure),
      basicSalary: calc.basicSalary,
      totalAllowances: calc.totalAllowances,
      totalDeductions: calc.totalDeductions,
      grossSalary: calc.grossSalary,
      netSalary: calc.netSalary,
      breakdown: calc.breakdown,
    };
  });

  const totalGross = roundCurrency(items.reduce((s, i) => s + i.grossSalary, 0));
  const totalDeductions = roundCurrency(
    items.reduce((s, i) => s + i.totalDeductions, 0),
  );
  const totalNet = roundCurrency(items.reduce((s, i) => s + i.netSalary, 0));

  return {
    month,
    year,
    payrollMonth: getPayrollMonthDate(month, year),
    items,
    totalGross,
    totalDeductions,
    totalNet,
    employeeCount: items.length,
  };
}

export async function previewPayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: PayrollRunInput,
): Promise<PayrollPreviewResult> {
  return buildPayrollPreview(supabase, profile, input);
}

export async function getEmployeeRunBreakdown(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { employeeId: string; month: number; year: number },
): Promise<EmployeePayrollRunBreakdown> {
  const { employeeId, month, year } = input;
  const organizationId = profile.employee.organizationId;
  const selectedMonthDate = getPayrollMonthDate(month, year);
  const today = new Date();
  const currentMonthDate = getPayrollMonthDate(today.getMonth() + 1, today.getFullYear());

  const { data: employee, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        departments:department_id (name),
        designations:designation_id (title),
        employment_types:employment_type_id (name)
      `,
    )
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!employee) throw new Error("Employee not found");

  const department = unwrapRelation(
    employee.departments as { name: string } | { name: string }[] | null,
  );
  const designation = unwrapRelation(
    employee.designations as { title: string } | { title: string }[] | null,
  );
  const employmentType = unwrapRelation(
    employee.employment_types as { name: string } | { name: string }[] | null,
  );

  const payrollSettings = await getPayrollSettings(supabase, organizationId);

  const [salaryStructure, attendance, leaveSummary, bonuses, reimbursements] =
    await Promise.all([
      getEffectiveSalaryStructure(supabase, employeeId, month, year),
      getAttendanceSummary(supabase, employeeId, month, year),
      getLeaveMonthSummary(supabase, employeeId, month, year),
      getPayableBonuses(
        supabase,
        employeeId,
        [selectedMonthDate, currentMonthDate],
        { includeAttached: true },
      ),
      getPayableReimbursements(
        supabase,
        employeeId,
        [
          getMonthDateRange(month, year),
          getMonthDateRange(today.getMonth() + 1, today.getFullYear()),
        ],
        { includeAttached: true },
      ),
    ]);

  const calc = calculateEmployeePayroll({
    month,
    year,
    salaryStructure: toSalaryStructureRow(salaryStructure as Record<string, unknown> | null),
    attendance,
    leaveSummary,
    bonuses,
    reimbursements,
    settings: {
      workingDaysCalculation: payrollSettings.settings.workingDaysCalculation,
      lossOfPayDeduction: payrollSettings.settings.leaveIntegration.lossOfPayDeduction,
      halfDayDeduction: payrollSettings.settings.leaveIntegration.halfDayDeduction,
      paidLeaveDeduction: payrollSettings.settings.leaveIntegration.paidLeaveDeduction,
    },
  });

  const bonusTotal = roundCurrency(
    bonuses.reduce((sum, row) => sum + Number(row.amount || 0), 0),
  );
  const claimsTotal = roundCurrency(
    reimbursements.reduce((sum, row) => sum + Number(row.amount || 0), 0),
  );

  return {
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
    departmentName: department?.name ?? null,
    designationTitle: designation?.title ?? null,
    employmentTypeName: employmentType?.name ?? null,
    basicSalary: calc.basicSalary,
    totalAllowances: calc.totalAllowances,
    totalDeductions: calc.totalDeductions,
    grossSalary: calc.grossSalary,
    netSalary: calc.netSalary,
    bonusTotal,
    claimsTotal,
    salaryTotal: roundCurrency(calc.grossSalary - bonusTotal - claimsTotal),
    breakdown: calc.breakdown,
    hasSalaryStructure: Boolean(salaryStructure),
    periodLabel: formatPayrollMonth(month, year),
  };
}

export async function generatePayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: PayrollRunInput,
): Promise<string> {
  const preview = await buildPayrollPreview(supabase, profile, input);
  const organizationId = profile.employee.organizationId;
  const payrollMonth = preview.payrollMonth;

  const { data: existing } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, is_locked")
    .eq("organization_id", organizationId)
    .eq("payroll_month", payrollMonth)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.is_locked) {
    throw new Error("Payroll for this month is locked and cannot be regenerated.");
  }

  if (
    existing &&
    existing.payroll_status !== "draft" &&
    existing.payroll_status !== "processing"
  ) {
    throw new Error(
      "Payroll for the selected period has already been generated. Open Run Payroll to review the existing run.",
    );
  }

  let payrollId = existing?.id;
  const actorId = actorUserId(profile);

  if (!payrollId) {
    const { data: created, error: createError } = await supabase
      .schema("hrms")
      .from("payrolls")
      .insert({
        organization_id: organizationId,
        payroll_month: payrollMonth,
        payroll_status: "draft",
        total_gross: preview.totalGross,
        total_deductions: preview.totalDeductions,
        total_net: preview.totalNet,
        notes: input.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      })
      .select("id")
      .single();

    if (createError) throw new Error(createError.message);
    payrollId = created.id;
  } else {
    const { error: updateError } = await supabase
      .schema("hrms")
      .from("payrolls")
      .update({
        total_gross: preview.totalGross,
        total_deductions: preview.totalDeductions,
        total_net: preview.totalNet,
        notes: input.notes ?? null,
        payroll_status: "draft",
        updated_by: actorId,
      })
      .eq("id", payrollId);

    if (updateError) throw new Error(updateError.message);

    const { error: deleteItemsError } = await supabase
      .schema("hrms")
      .from("payroll_items")
      .delete()
      .eq("payroll_id", payrollId);

    if (deleteItemsError) {
      throw new Error(
        "Payroll for the selected period has already been generated and cannot be regenerated while payslips exist.",
      );
    }
  }

  const employees = await getActiveEmployees(supabase, organizationId);

  const itemRows = preview.items.map((item) => ({
    payroll_id: payrollId,
    employee_id: item.employeeId,
    salary_structure_id: item.salaryStructureId ?? null,
    basic_salary: item.basicSalary,
    total_allowances: item.totalAllowances,
    total_deductions: item.totalDeductions,
    gross_salary: item.grossSalary,
    net_salary: item.netSalary,
    breakdown: item.breakdown,
    created_by: actorId,
    updated_by: actorId,
  }));

  if (itemRows.length > 0) {
    const { error: itemError } = await supabase.schema("hrms").from("payroll_items").insert(itemRows);
    if (itemError) {
      if (itemError.code === "23505") {
        throw new Error(
          "Payroll for the selected period has already been generated. Open Run Payroll to review the existing run.",
        );
      }
      throw new Error(itemError.message);
    }
  }

  const month = input.month;
  const year = input.year;
  const range = getMonthDateRange(month, year);
  const employeeIds = employees.map((employee) => employee.id);

  for (let i = 0; i < employeeIds.length; i += QUERY_IN_CHUNK) {
    const chunk = employeeIds.slice(i, i + QUERY_IN_CHUNK);
    const { error: bonusAttachError } = await supabase
      .schema("hrms")
      .from("employee_bonuses")
      .update({ payroll_id: payrollId, updated_by: actorId })
      .in("employee_id", chunk)
      .eq("bonus_month", payrollMonth)
      .in("bonus_status", ["pending", "approved"])
      .is("payroll_id", null);
    if (bonusAttachError) throw new Error(bonusAttachError.message);

    const { error: claimAttachError } = await supabase
      .schema("hrms")
      .from("employee_reimbursements")
      .update({ payroll_id: payrollId, updated_by: actorId })
      .in("employee_id", chunk)
      .in("reimbursement_status", ["pending", "approved"])
      .is("payroll_id", null)
      .gte("expense_date", range.startDate)
      .lte("expense_date", range.endDate);
    if (claimAttachError) throw new Error(claimAttachError.message);
  }

  return payrollId;
}

export async function processPayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<void> {
  const { data: payroll, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, is_locked, organization_id")
    .eq("id", payrollId)
    .is("deleted_at", null)
    .single();

  if (error || !payroll) throw new Error("Payroll run not found.");
  if (payroll.is_locked) throw new Error("Payroll is locked.");
  if (payroll.organization_id !== profile.employee.organizationId) {
    throw new Error("Unauthorized payroll access.");
  }

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("payrolls")
    .update({
      payroll_status: "processed",
      processed_at: new Date().toISOString(),
      processed_by: actorUserId(profile),
      updated_by: actorUserId(profile),
    })
    .eq("id", payrollId);

  if (updateError) throw new Error(updateError.message);

  // Cron/system actors have no employee row; skip multi-level approvals (auto-finalize locks next).
  if (actorUserId(profile) && profile.employee.id) {
    await initializePayrollApprovals(supabase, profile, payrollId);
  }
  emitHrmsWebhook(profile.employee.organizationId, "payroll.processed", {
    id: payrollId,
  });
}

async function initializePayrollApprovals(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
) {
  const organizationId = profile.employee.organizationId;

  const { data: hrApprovers } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("employee_id, roles!inner (code)")
    .eq("organization_id", organizationId)
    .in("roles.code", ["hr_admin", "super_admin"]);

  const approverIds = [
    ...new Set(
      (hrApprovers ?? [])
        .map((row) => row.employee_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const levels = [1, 2, 3];
  for (const level of levels) {
    const approverEmployeeId =
      approverIds[level - 1] ?? profile.employee.id;

    const { error } = await supabase.schema("hrms").from("payroll_approvals").upsert(
      {
        payroll_id: payrollId,
        approver_employee_id: approverEmployeeId,
        approval_level: level,
        approval_status: level === 1 ? "pending" : "pending",
        created_by: profile.userId,
        updated_by: profile.userId,
      },
      { onConflict: "payroll_id,approval_level" },
    );

    if (error) throw new Error(error.message);
  }
}

export async function approvePayrollStep(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
  comments?: string,
): Promise<void> {
  const { data: payroll, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, is_locked, organization_id")
    .eq("id", payrollId)
    .is("deleted_at", null)
    .single();

  if (error || !payroll) throw new Error("Payroll run not found.");
  if (payroll.is_locked) throw new Error("Payroll is already locked.");

  const { data: approvals, error: approvalsError } = await supabase
    .schema("hrms")
    .from("payroll_approvals")
    .select("id, approval_level, approval_status")
    .eq("payroll_id", payrollId)
    .is("deleted_at", null)
    .order("approval_level", { ascending: true });

  if (approvalsError) throw new Error(approvalsError.message);

  const pending = (approvals ?? []).find((a) => a.approval_status === "pending");
  if (!pending) throw new Error("No pending approval step.");

  const { error: approveError } = await supabase
    .schema("hrms")
    .from("payroll_approvals")
    .update({
      approval_status: "approved",
      comments: comments ?? null,
      acted_at: new Date().toISOString(),
      approver_employee_id: profile.employee.id,
      updated_by: profile.userId,
    })
    .eq("id", pending.id);

  if (approveError) throw new Error(approveError.message);

  const remaining = (approvals ?? []).filter(
    (a) => a.id !== pending.id && a.approval_status === "pending",
  );

  if (remaining.length === 0) {
    await supabase
      .schema("hrms")
      .from("payrolls")
      .update({
        payroll_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: profile.userId,
        is_locked: true,
        updated_by: profile.userId,
      })
      .eq("id", payrollId);

    await generatePayslips(supabase, profile, payrollId);
  }
}

export async function rejectPayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
  comments: string,
): Promise<void> {
  const { data: pending } = await supabase
    .schema("hrms")
    .from("payroll_approvals")
    .select("id")
    .eq("payroll_id", payrollId)
    .eq("approval_status", "pending")
    .order("approval_level", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pending) {
    await supabase
      .schema("hrms")
      .from("payroll_approvals")
      .update({
        approval_status: "rejected",
        comments,
        acted_at: new Date().toISOString(),
        approver_employee_id: profile.employee.id,
        updated_by: profile.userId,
      })
      .eq("id", pending.id);
  }

  const { error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .update({
      payroll_status: "cancelled",
      updated_by: profile.userId,
    })
    .eq("id", payrollId);

  if (error) throw new Error(error.message);
}

export async function markPayrollPaid(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .update({
      payroll_status: "paid",
      updated_by: profile.userId,
    })
    .eq("id", payrollId)
    .eq("payroll_status", "approved");

  if (error) throw new Error(error.message);

  await supabase
    .schema("hrms")
    .from("employee_bonuses")
    .update({ bonus_status: "paid", updated_by: profile.userId })
    .eq("payroll_id", payrollId);

  await supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .update({ reimbursement_status: "paid", updated_by: profile.userId })
    .eq("payroll_id", payrollId);
}

export async function generatePayslips(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<void> {
  const { data: payroll } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("payroll_month")
    .eq("id", payrollId)
    .single();

  if (!payroll) throw new Error("Payroll not found.");

  const payrollSettings = await getPayrollSettings(
    supabase,
    profile.employee.organizationId,
  );
  const schedule = computePayslipSchedule(payroll.payroll_month, {
    salaryCreditDay: payrollSettings.settings.salaryCreditDate,
    publishDay: payrollSettings.settings.payslipAvailableDay,
  });

  const { data: items, error } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      `
        id,
        employee_id,
        employees (employee_code)
      `,
    )
    .eq("payroll_id", payrollId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  for (const item of items ?? []) {
    const employee = unwrapRelation(
      item.employees as { employee_code: string } | { employee_code: string }[] | null,
    );
    if (!employee) continue;

    const payslipNumber = generatePayslipNumber(
      employee.employee_code,
      payroll.payroll_month,
    );

    const { data: existing } = await supabase
      .schema("hrms")
      .from("payslips")
      .select("id")
      .eq("payroll_item_id", item.id)
      .maybeSingle();

    if (existing) continue;

    const actorId = actorUserId(profile);
    const { error: insertError } = await supabase.schema("hrms").from("payslips").insert({
      payroll_id: payrollId,
      payroll_item_id: item.id,
      employee_id: item.employee_id,
      payslip_number: payslipNumber,
      salary_credit_date: schedule.salaryCreditDate,
      published_at: schedule.publishedAt,
      payroll_generated_at: new Date().toISOString(),
      payment_mode: "Bank Transfer",
      payslip_version: PAYSLIP_VERSION,
      created_by: actorId,
      updated_by: actorId,
    });

    if (insertError) {
      const duplicate =
        insertError.code === "23505" ||
        insertError.message.toLowerCase().includes("duplicate");
      if (duplicate) continue;
      throw new Error(insertError.message);
    }
  }
}

export async function emailPayslip(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payslipId: string,
  appOrigin: string,
): Promise<void> {
  const payslip = await getPayslipById(supabase, profile, payslipId, {
    bypassAccessCheck: true,
  });
  if (!payslip) throw new PayslipEmailError("Payslip not found.");

  if (!payslip.canEmployeeAccess) {
    const isOwnPayslip = payslip.employee.id === profile.employee.id;
    if (isOwnPayslip || !canAccessPayslipDuringReview(profile.permissionCodes)) {
      throw new PayslipEmailError("Payslip is not yet published to employees.");
    }
  }

  if (!payslip.storagePath) {
    await storePayslipPdf(supabase, payslip, profile.employee.organizationId);
  }

  const emailResult = await sendPayslipReadyEmail(payslip, appOrigin);
  if (!emailResult.delivered) {
    throw new PayslipEmailError(
      emailResult.skipped
        ? "Email delivery is not configured yet. Contact your administrator."
        : "The payslip email could not be delivered. Please try again.",
    );
  }

  // The email has already been delivered at this point, so bookkeeping failures must
  // not be reported back as a failed send. Log them and let the caller report success.
  const monthLabel = formatPayrollMonthLabel(payslip.payrollMonth);
  try {
    await notifyEmployee(supabase, {
      organizationId: profile.employee.organizationId,
      employeeId: payslip.employee.id,
      title: "Payslip available",
      message: `Your payslip for ${monthLabel} (${payslip.payslipNumber}) is ready to view.`,
      notificationType: "payslip_available",
      module: "payroll",
      priority: "medium",
      actionUrl: PAYROLL_ROUTES.payslipDetail(payslipId),
      sourceEventKey: `payslip_available:${payslipId}`,
      templateKey: "payslip_available",
      templateVariables: { month: monthLabel, payslipNumber: payslip.payslipNumber },
      createdBy: profile.userId,
    });

    await supabase
      .schema("hrms")
      .from("payslips")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", payslipId);
  } catch (error) {
    console.error("[payroll] payslip email sent but bookkeeping failed", {
      payslipId,
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function archivePayslip(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payslipId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("payslips")
    .update({
      archived_at: new Date().toISOString(),
      status: "archived",
      updated_by: profile.userId,
    })
    .eq("id", payslipId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function updatePayrollItemAdjustments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    payrollItemId: string;
    additionalEarnings: number;
    bonus: number;
    incentive: number;
    reimbursements: number;
    additionalDeductions: number;
    tdsOverride?: number | null;
    otherDeductionsOverride?: number | null;
    lopDaysOverride?: number | null;
    confirmReopen?: boolean;
  },
): Promise<void> {
  const { data: item, error } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      `
        id,
        employee_id,
        breakdown,
        payrolls!inner (id, organization_id, is_locked, payroll_status, payroll_month),
        payslips (id, email_sent_at, published_at)
      `,
    )
    .eq("id", input.payrollItemId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!item) throw new Error("Payroll line not found.");

  const payroll = unwrapRelation(
    item.payrolls as
      | {
          id: string;
          organization_id: string;
          is_locked: boolean;
          payroll_status: string;
          payroll_month: string;
        }
      | {
          id: string;
          organization_id: string;
          is_locked: boolean;
          payroll_status: string;
          payroll_month: string;
        }[]
      | null,
  );
  if (!payroll || payroll.organization_id !== profile.employee.organizationId) {
    throw new Error("Payroll line not found.");
  }
  if (payroll.is_locked) {
    throw new Error("This payroll period is locked. Reopen it before editing.");
  }

  const payslip = unwrapRelation(
    item.payslips as
      | { id: string; email_sent_at: string | null; published_at?: string | null }
      | { id: string; email_sent_at: string | null; published_at?: string | null }[]
      | null,
  );
  if ((payslip?.email_sent_at || payslip?.published_at) && !input.confirmReopen) {
    throw new Error(
      "This payslip was already sent. Confirm reopen to update payroll before sending again.",
    );
  }

  const monthDate = new Date(`${payroll.payroll_month.slice(0, 10)}T00:00:00.000Z`);
  const month = monthDate.getUTCMonth() + 1;
  const year = monthDate.getUTCFullYear();
  const existingBreakdown = (item.breakdown as PayrollBreakdown) ?? null;
  const payrollSettings = await getPayrollSettings(supabase, profile.employee.organizationId);

  const [salaryStructure, attendance, leaveSummary, bonuses, reimbursements] = await Promise.all([
    getEffectiveSalaryStructure(supabase, item.employee_id, month, year),
    getAttendanceSummary(supabase, item.employee_id, month, year),
    getLeaveMonthSummary(supabase, item.employee_id, month, year),
    getPayableBonuses(supabase, item.employee_id, [getPayrollMonthDate(month, year)], {
      includeAttached: true,
    }),
    getPayableReimbursements(supabase, item.employee_id, [getMonthDateRange(month, year)], {
      includeAttached: true,
    }),
  ]);

  const calc = calculateEmployeePayroll({
    month,
    year,
    salaryStructure: toSalaryStructureRow(salaryStructure as Record<string, unknown> | null),
    attendance,
    leaveSummary,
    bonuses,
    reimbursements,
    settings: {
      workingDaysCalculation: payrollSettings.settings.workingDaysCalculation,
      lossOfPayDeduction: payrollSettings.settings.leaveIntegration.lossOfPayDeduction,
      halfDayDeduction: payrollSettings.settings.leaveIntegration.halfDayDeduction,
      paidLeaveDeduction: payrollSettings.settings.leaveIntegration.paidLeaveDeduction,
    },
    adjustments: {
      additionalEarnings: input.additionalEarnings,
      bonus: input.bonus,
      incentive: input.incentive,
      reimbursements: input.reimbursements,
      additionalDeductions: input.additionalDeductions,
      tdsOverride: input.tdsOverride,
      otherDeductionsOverride: input.otherDeductionsOverride,
      lopDaysOverride: input.lopDaysOverride,
      itemStatus: "reviewed",
    },
  });

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .update({
      basic_salary: calc.basicSalary,
      total_allowances: calc.totalAllowances,
      total_deductions: calc.totalDeductions,
      gross_salary: calc.grossSalary,
      net_salary: calc.netSalary,
      breakdown: {
        ...calc.breakdown,
        payrollLifecycle: {
          itemStatus: "reviewed" as const,
          sentAt: existingBreakdown?.payrollLifecycle?.sentAt ?? null,
        },
      },
      updated_by: actorUserId(profile),
    })
    .eq("id", input.payrollItemId);

  if (updateError) throw new Error(updateError.message);

  if (input.confirmReopen && payslip?.id) {
    await supabase
      .schema("hrms")
      .from("payslips")
      .update({
        published_at: null,
        email_sent_at: null,
        updated_by: actorUserId(profile),
      })
      .eq("id", payslip.id);
  }

  const { data: items } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select("gross_salary, total_deductions, net_salary")
    .eq("payroll_id", payroll.id)
    .is("deleted_at", null);

  await supabase
    .schema("hrms")
    .from("payrolls")
    .update({
      total_gross: roundCurrency(
        (items ?? []).reduce((sum, row) => sum + Number(row.gross_salary ?? 0), 0),
      ),
      total_deductions: roundCurrency(
        (items ?? []).reduce((sum, row) => sum + Number(row.total_deductions ?? 0), 0),
      ),
      total_net: roundCurrency(
        (items ?? []).reduce((sum, row) => sum + Number(row.net_salary ?? 0), 0),
      ),
      payroll_status: payroll.payroll_status === "draft" ? "processed" : payroll.payroll_status,
      updated_by: actorUserId(profile),
    })
    .eq("id", payroll.id);
}

export async function ensureUnpublishedPayslipForPayrollItem(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollItemId: string,
): Promise<string> {
  const { data: item, error } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      `
        id,
        employee_id,
        payrolls!inner (id, organization_id, payroll_month),
        employees (employee_code),
        payslips (id)
      `,
    )
    .eq("id", payrollItemId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!item) throw new Error("Payroll line not found.");

  const payroll = unwrapRelation(
    item.payrolls as
      | { id: string; organization_id: string; payroll_month: string }
      | { id: string; organization_id: string; payroll_month: string }[]
      | null,
  );
  if (!payroll || payroll.organization_id !== profile.employee.organizationId) {
    throw new Error("Payroll line not found.");
  }

  const existingPayslip = unwrapRelation(
    item.payslips as { id: string } | { id: string }[] | null,
  );
  if (existingPayslip?.id) return existingPayslip.id;

  const employee = unwrapRelation(
    item.employees as { employee_code: string } | { employee_code: string }[] | null,
  );
  const actorId = actorUserId(profile);
  const nowIso = new Date().toISOString();
  const payslipNumber = generatePayslipNumber(
    employee?.employee_code ?? "EMP",
    payroll.payroll_month,
  );
  const { data: created, error: insertError } = await supabase
    .schema("hrms")
    .from("payslips")
    .insert({
      payroll_id: payroll.id,
      payroll_item_id: item.id,
      employee_id: item.employee_id,
      payslip_number: payslipNumber,
      salary_credit_date: nowIso.slice(0, 10),
      published_at: null,
      payroll_generated_at: nowIso,
      payment_mode: "Bank Transfer",
      payslip_version: PAYSLIP_VERSION,
      created_by: actorId,
      updated_by: actorId,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  return created.id;
}

export async function releaseEmployeePayslip(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollItemId: string,
  appOrigin: string,
): Promise<{ emailed: boolean }> {
  const { data: item, error } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      `
        id,
        employee_id,
        breakdown,
        payroll_id,
        payrolls!inner (id, organization_id, payroll_month),
        employees (employee_code),
        payslips (id, email_sent_at, published_at)
      `,
    )
    .eq("id", payrollItemId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!item) throw new Error("Payroll line not found.");

  const payroll = unwrapRelation(
    item.payrolls as
      | { id: string; organization_id: string; payroll_month: string }
      | { id: string; organization_id: string; payroll_month: string }[]
      | null,
  );
  if (!payroll || payroll.organization_id !== profile.employee.organizationId) {
    throw new Error("Payroll line not found.");
  }

  const existingPayslip = unwrapRelation(
    item.payslips as
      | { id: string; email_sent_at: string | null; published_at?: string | null }
      | { id: string; email_sent_at: string | null; published_at?: string | null }[]
      | null,
  );
  if (
    (Boolean(existingPayslip?.email_sent_at) ||
      (existingPayslip?.published_at &&
        isPayslipPublishedToEmployee(existingPayslip.published_at)))
  ) {
    throw new Error("Payslip already sent for this employee and period.");
  }

  const employee = unwrapRelation(
    item.employees as { employee_code: string } | { employee_code: string }[] | null,
  );
  const actorId = actorUserId(profile);
  const nowIso = new Date().toISOString();
  let payslipId = existingPayslip?.id ?? null;

  if (!payslipId) {
    const payslipNumber = generatePayslipNumber(
      employee?.employee_code ?? "EMP",
      payroll.payroll_month,
    );
    const { data: created, error: insertError } = await supabase
      .schema("hrms")
      .from("payslips")
      .insert({
        payroll_id: payroll.id,
        payroll_item_id: item.id,
        employee_id: item.employee_id,
        payslip_number: payslipNumber,
        salary_credit_date: nowIso.slice(0, 10),
        published_at: nowIso,
        payroll_generated_at: nowIso,
        payment_mode: "Bank Transfer",
        payslip_version: PAYSLIP_VERSION,
        created_by: actorId,
        updated_by: actorId,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    payslipId = created.id;
  } else {
    await supabase
      .schema("hrms")
      .from("payslips")
      .update({ published_at: nowIso, updated_by: actorId })
      .eq("id", payslipId);
  }

  const breakdown = (item.breakdown as PayrollBreakdown) ?? {
    earnings: [],
    deductions: [],
    attendance: {
      workingDays: 0,
      presentDays: 0,
      absentDays: 0,
      lopDays: 0,
      leaveLopDays: 0,
      overtimeHours: 0,
    },
  };
  await supabase
    .schema("hrms")
    .from("payroll_items")
    .update({
      breakdown: {
        ...breakdown,
        payrollLifecycle: { itemStatus: "sent", sentAt: nowIso },
      },
      updated_by: actorId,
    })
    .eq("id", item.id);

  if (!payslipId) {
    throw new Error("Payslip could not be created.");
  }

  try {
    await emailPayslip(supabase, profile, payslipId, appOrigin);
    return { emailed: true };
  } catch {
    return { emailed: false };
  }
}

export async function snapshotPayslipVersion(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payslipId: string,
): Promise<void> {
  const payslip = await getPayslipById(supabase, profile, payslipId, {
    bypassAccessCheck: true,
  });
  if (!payslip) throw new Error("Payslip not found.");

  const { count } = await supabase
    .schema("hrms")
    .from("payslip_versions")
    .select("id", { count: "exact", head: true })
    .eq("payslip_id", payslipId);

  const versionNumber = (count ?? 0) + 1;
  const numericVersion = Number.parseFloat(payslip.payslipVersion) || 1;

  const { error: versionError } = await supabase.schema("hrms").from("payslip_versions").insert({
    payslip_id: payslipId,
    version_number: versionNumber,
    payslip_number: payslip.payslipNumber,
    storage_path: payslip.storagePath,
    snapshot: {
      grossSalary: payslip.grossSalary,
      netSalary: payslip.netSalary,
      breakdown: payslip.breakdown,
      employee: payslip.employee,
    },
    salary_credit_date: payslip.salaryCreditDate,
    published_at: payslip.publishedAt,
    payroll_generated_at: payslip.payrollGeneratedAt,
    payment_mode: payslip.paymentMode,
    transaction_reference: payslip.transactionReference,
    created_by: profile.userId,
  });

  if (versionError) throw new Error(versionError.message);

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("payslips")
    .update({
      payslip_version: String(numericVersion + 1),
      storage_path: null,
      email_sent_at: null,
      updated_by: profile.userId,
    })
    .eq("id", payslipId);

  if (updateError) throw new Error(updateError.message);
}

export async function createSalaryStructure(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<string> {
  const parsed = salaryStructureFormSchema.parse(input);

  const { data: previous } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select("id, effective_from")
    .eq("employee_id", parsed.employeeId)
    .is("deleted_at", null)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previous) {
    if (previous.effective_from === parsed.effectiveFrom) {
      throw new Error(
        "A salary structure already exists for this employee with the same effective date. Edit that record or choose a different effective date.",
      );
    }
    const dayBefore = new Date(parsed.effectiveFrom);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const effectiveTo = dayBefore.toISOString().slice(0, 10);

    await supabase
      .schema("hrms")
      .from("salary_structures")
      .update({
        effective_to: effectiveTo,
        updated_by: profile.userId,
      })
      .eq("id", previous.id);
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .insert({
      employee_id: parsed.employeeId,
      effective_from: parsed.effectiveFrom,
      effective_to: parsed.effectiveTo ?? null,
      currency_code: parsed.currencyCode,
      basic_salary: parsed.basicSalary,
      hra_amount: parsed.hraAmount,
      transport_allowance: parsed.transportAllowance,
      other_allowances: parsed.otherAllowances,
      tax_deduction: parsed.taxDeduction,
      other_deductions: parsed.otherDeductions,
      gross_salary: parsed.grossSalary,
      net_salary: parsed.netSalary,
      components: parsed.components,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await syncEmployeeEmploymentType(
    supabase,
    profile,
    parsed.employeeId,
    parsed.employmentTypeId,
  );

  await refreshDraftPayrollItemsForEmployee(
    supabase,
    profile,
    parsed.employeeId,
  );

  return data.id;
}

async function isSalaryStructureUsedInFinalizedPayroll(
  supabase: AuthSupabaseClient,
  structureId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      "id, payrolls!inner(is_locked, payroll_status, deleted_at)",
    )
    .eq("salary_structure_id", structureId)
    .is("deleted_at", null)
    .limit(25);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const payroll = unwrapRelation(
      row.payrolls as
        | { is_locked: boolean; payroll_status: string; deleted_at: string | null }
        | { is_locked: boolean; payroll_status: string; deleted_at: string | null }[]
        | null,
    );
    if (!payroll || payroll.deleted_at) continue;
    if (
      payroll.is_locked ||
      payroll.payroll_status === "approved" ||
      payroll.payroll_status === "paid"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Recalculate this employee's line items on any unlocked draft/processing payroll
 * so Team Payroll salary edits flow into the applicable month without a second manual entry.
 * Finalized (locked/approved/paid) runs are never touched.
 */
export async function refreshDraftPayrollItemsForEmployee(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  const { data: draftPayrolls, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_month, payroll_status, is_locked")
    .eq("organization_id", organizationId)
    .in("payroll_status", ["draft", "processing"])
    .eq("is_locked", false)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  if (!draftPayrolls?.length) return;

  const payrollSettings = await getPayrollSettings(supabase, organizationId);
  const calcSettings = {
    workingDaysCalculation: payrollSettings.settings.workingDaysCalculation,
    lossOfPayDeduction: payrollSettings.settings.leaveIntegration.lossOfPayDeduction,
    halfDayDeduction: payrollSettings.settings.leaveIntegration.halfDayDeduction,
    paidLeaveDeduction: payrollSettings.settings.leaveIntegration.paidLeaveDeduction,
  };

  for (const payroll of draftPayrolls) {
    const monthDate = new Date(`${payroll.payroll_month.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(monthDate.getTime())) continue;
    const month = monthDate.getUTCMonth() + 1;
    const year = monthDate.getUTCFullYear();

    const [salaryStructure, attendance, leaveSummary, bonuses, reimbursements] =
      await Promise.all([
        getEffectiveSalaryStructure(supabase, employeeId, month, year),
        getAttendanceSummary(supabase, employeeId, month, year),
        getLeaveMonthSummary(supabase, employeeId, month, year),
        getPayableBonuses(supabase, employeeId, [getPayrollMonthDate(month, year)], {
          includeAttached: true,
        }),
        getPayableReimbursements(supabase, employeeId, [getMonthDateRange(month, year)], {
          includeAttached: true,
        }),
      ]);

    const { data: existingItem } = await supabase
      .schema("hrms")
      .from("payroll_items")
      .select("id, breakdown")
      .eq("payroll_id", payroll.id)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .maybeSingle();

    const existingAdjustments = (existingItem?.breakdown as PayrollBreakdown | null)?.hrAdjustments;
    if ((existingItem?.breakdown as PayrollBreakdown | null)?.payrollLifecycle?.itemStatus === "sent") {
      continue;
    }

    const calc = calculateEmployeePayroll({
      month,
      year,
      salaryStructure: toSalaryStructureRow(salaryStructure as Record<string, unknown> | null),
      attendance,
      leaveSummary,
      bonuses,
      reimbursements,
      settings: calcSettings,
      adjustments: existingAdjustments,
    });

    if (existingItem) {
      const { error: updateError } = await supabase
        .schema("hrms")
        .from("payroll_items")
        .update({
          salary_structure_id: salaryStructure?.id ?? null,
          basic_salary: calc.basicSalary,
          total_allowances: calc.totalAllowances,
          total_deductions: calc.totalDeductions,
          gross_salary: calc.grossSalary,
          net_salary: calc.netSalary,
          breakdown: calc.breakdown,
          updated_by: actorUserId(profile),
        })
        .eq("id", existingItem.id);
      if (updateError) throw new Error(updateError.message);
    } else if (salaryStructure || calc.grossSalary > 0) {
      const actorId = actorUserId(profile);
      const { error: insertError } = await supabase.schema("hrms").from("payroll_items").insert({
        payroll_id: payroll.id,
        employee_id: employeeId,
        salary_structure_id: salaryStructure?.id ?? null,
        basic_salary: calc.basicSalary,
        total_allowances: calc.totalAllowances,
        total_deductions: calc.totalDeductions,
        gross_salary: calc.grossSalary,
        net_salary: calc.netSalary,
        breakdown: calc.breakdown,
        created_by: actorId,
        updated_by: actorId,
      });
      if (insertError && insertError.code !== "23505") {
        throw new Error(insertError.message);
      }
    }

    const { data: items } = await supabase
      .schema("hrms")
      .from("payroll_items")
      .select("gross_salary, total_deductions, net_salary")
      .eq("payroll_id", payroll.id)
      .is("deleted_at", null);

    const totalGross = roundCurrency(
      (items ?? []).reduce((sum, row) => sum + Number(row.gross_salary ?? 0), 0),
    );
    const totalDeductions = roundCurrency(
      (items ?? []).reduce((sum, row) => sum + Number(row.total_deductions ?? 0), 0),
    );
    const totalNet = roundCurrency(
      (items ?? []).reduce((sum, row) => sum + Number(row.net_salary ?? 0), 0),
    );

    await supabase
      .schema("hrms")
      .from("payrolls")
      .update({
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        updated_by: actorUserId(profile),
      })
      .eq("id", payroll.id);
  }
}

export async function updateSalaryStructure(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  structureId: string,
  input: unknown,
): Promise<void> {
  const parsed = salaryStructureFormSchema.parse(input);

  const { data: existing, error: fetchError } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select(
      "id, employee_id, effective_from, effective_to, employees!inner(organization_id)",
    )
    .eq("id", structureId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Salary structure not found");

  const employee = unwrapRelation(
    existing.employees as { organization_id: string } | { organization_id: string }[] | null,
  );
  if (employee?.organization_id !== profile.employee.organizationId) {
    throw new Error("Salary structure not found");
  }

  if (parsed.employeeId !== existing.employee_id) {
    throw new Error("Employee cannot be changed when editing a salary structure.");
  }

  const usedInFinalized = await isSalaryStructureUsedInFinalizedPayroll(
    supabase,
    structureId,
  );
  const effectiveFromChanged = existing.effective_from !== parsed.effectiveFrom;

  // Preserve historical payroll: never mutate a structure already used on a locked run.
  // Instead close it and insert a new effective version (source of truth going forward).
  if (usedInFinalized || effectiveFromChanged) {
    if (usedInFinalized && !effectiveFromChanged) {
      throw new Error(
        "This salary structure is already used on a finalized payroll. Save a new structure with a later Effective from date so historical payslips stay unchanged.",
      );
    }

    const dayBefore = new Date(parsed.effectiveFrom);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const effectiveTo = dayBefore.toISOString().slice(0, 10);

    const { error: closeError } = await supabase
      .schema("hrms")
      .from("salary_structures")
      .update({
        effective_to: effectiveTo,
        updated_by: profile.userId,
      })
      .eq("id", structureId);
    if (closeError) throw new Error(closeError.message);

    const { error: insertError } = await supabase.schema("hrms").from("salary_structures").insert({
      employee_id: parsed.employeeId,
      effective_from: parsed.effectiveFrom,
      effective_to: parsed.effectiveTo ?? null,
      currency_code: parsed.currencyCode,
      basic_salary: parsed.basicSalary,
      hra_amount: parsed.hraAmount,
      transport_allowance: parsed.transportAllowance,
      other_allowances: parsed.otherAllowances,
      tax_deduction: parsed.taxDeduction,
      other_deductions: parsed.otherDeductions,
      gross_salary: parsed.grossSalary,
      net_salary: parsed.netSalary,
      components: parsed.components,
      created_by: profile.userId,
      updated_by: profile.userId,
    });
    if (insertError) throw new Error(insertError.message);
  } else {
    const { error } = await supabase
      .schema("hrms")
      .from("salary_structures")
      .update({
        effective_from: parsed.effectiveFrom,
        effective_to: parsed.effectiveTo ?? null,
        currency_code: parsed.currencyCode,
        basic_salary: parsed.basicSalary,
        hra_amount: parsed.hraAmount,
        transport_allowance: parsed.transportAllowance,
        other_allowances: parsed.otherAllowances,
        tax_deduction: parsed.taxDeduction,
        other_deductions: parsed.otherDeductions,
        gross_salary: parsed.grossSalary,
        net_salary: parsed.netSalary,
        components: parsed.components,
        updated_by: profile.userId,
      })
      .eq("id", structureId);

    if (error) throw new Error(error.message);
  }

  await syncEmployeeEmploymentType(
    supabase,
    profile,
    parsed.employeeId,
    parsed.employmentTypeId,
  );

  await refreshDraftPayrollItemsForEmployee(supabase, profile, parsed.employeeId);
}

export async function deleteSalaryStructure(
  supabase: AuthSupabaseClient,
  _profile: UserProfile,
  structureId: string,
): Promise<void> {
  const { data, error } = await supabase.schema("hrms").rpc("soft_delete_salary_structure", {
    p_structure_id: structureId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Salary structure not found or already deleted.");
}

export async function createBonus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    employeeId: string;
    bonusType: string;
    amount: number;
    bonusMonth: number;
    bonusYear: number;
    reason?: string;
    remarks?: string;
    attachmentPath?: string;
  },
): Promise<string> {
  const bonusMonth = getPayrollMonthDate(input.bonusMonth, input.bonusYear);

  const { data, error } = await supabase
    .schema("hrms")
    .from("employee_bonuses")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: input.employeeId,
      bonus_type: input.bonusType,
      amount: input.amount,
      bonus_month: bonusMonth,
      reason: input.reason ?? null,
      remarks: input.remarks ?? null,
      attachment_path: input.attachmentPath ?? null,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await initializeBonusApprovals(supabase, profile, data.id);
  return data.id;
}

async function initializeBonusApprovals(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  bonusId: string,
) {
  const levels = [1, 2, 3];
  for (const level of levels) {
    const { error } = await supabase.schema("hrms").from("bonus_approvals").insert({
      bonus_id: bonusId,
      approval_level: level,
      approval_status: "pending",
      created_by: profile.userId,
      updated_by: profile.userId,
    });

    if (error) throw new Error(error.message);
  }
}

export async function approveBonus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  bonusId: string,
  comments?: string,
): Promise<void> {
  const { data: bonus, error: bonusError } = await supabase
    .schema("hrms")
    .from("employee_bonuses")
    .select("id, bonus_status, organization_id")
    .eq("id", bonusId)
    .is("deleted_at", null)
    .single();

  if (bonusError || !bonus) throw new Error("Bonus not found.");
  if (bonus.bonus_status === "approved" || bonus.bonus_status === "paid") {
    throw new Error("Bonus is already approved.");
  }

  const { data: approvals, error: approvalsError } = await supabase
    .schema("hrms")
    .from("bonus_approvals")
    .select("id, approval_level, approval_status")
    .eq("bonus_id", bonusId)
    .is("deleted_at", null)
    .order("approval_level", { ascending: true });

  if (approvalsError) throw new Error(approvalsError.message);

  const pending = (approvals ?? []).find((row) => row.approval_status === "pending");

  if (!pending) {
    await supabase
      .schema("hrms")
      .from("employee_bonuses")
      .update({
        bonus_status: "approved",
        approved_by: profile.userId,
        approved_at: new Date().toISOString(),
        approver_employee_id: profile.employee.id,
        updated_by: profile.userId,
      })
      .eq("id", bonusId);
    return;
  }

  const { error: approveError } = await supabase
    .schema("hrms")
    .from("bonus_approvals")
    .update({
      approval_status: "approved",
      comments: comments ?? null,
      acted_at: new Date().toISOString(),
      approver_employee_id: profile.employee.id,
      updated_by: profile.userId,
    })
    .eq("id", pending.id);

  if (approveError) throw new Error(approveError.message);

  const remaining = (approvals ?? []).filter(
    (row) => row.id !== pending.id && row.approval_status === "pending",
  );

  if (remaining.length === 0) {
    const { error } = await supabase
      .schema("hrms")
      .from("employee_bonuses")
      .update({
        bonus_status: "approved",
        approved_by: profile.userId,
        approved_at: new Date().toISOString(),
        approver_employee_id: profile.employee.id,
        updated_by: profile.userId,
      })
      .eq("id", bonusId);

    if (error) throw new Error(error.message);
  }
}

export async function createReimbursement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    employeeId: string;
    category: string;
    amount: number;
    expenseDate: string;
    description?: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: input.employeeId,
      category: input.category,
      amount: input.amount,
      expense_date: input.expenseDate,
      description: input.description ?? null,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function approveReimbursement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  reimbursementId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("employee_reimbursements")
    .update({
      reimbursement_status: "approved",
      approver_employee_id: profile.employee.id,
      approved_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", reimbursementId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function createSalaryRevision(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<string> {
  const parsed = salaryRevisionFormSchema.parse(input);

  const { data: currentStructure } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select("id, gross_salary, net_salary")
    .eq("employee_id", parsed.employeeId)
    .is("deleted_at", null)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newStructureId = await createSalaryStructure(supabase, profile, input);

  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_revisions")
    .insert({
      organization_id: profile.employee.organizationId,
      employee_id: parsed.employeeId,
      previous_structure_id: currentStructure?.id ?? null,
      new_structure_id: newStructureId,
      old_gross_salary: currentStructure ? Number(currentStructure.gross_salary) : 0,
      new_gross_salary: parsed.grossSalary,
      old_net_salary: currentStructure ? Number(currentStructure.net_salary) : 0,
      new_net_salary: parsed.netSalary,
      effective_from: parsed.effectiveFrom,
      revision_status: "applied",
      reason: parsed.reason,
      approver_employee_id: profile.employee.id,
      approved_at: new Date().toISOString(),
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { autoGenerateLetterForEmployee } = await import(
    "@/lib/documents/services/document-mutations"
  );
  await autoGenerateLetterForEmployee(supabase, profile, {
    employeeId: parsed.employeeId,
    letterType: "salary_revision_letter",
    salaryOverride: new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(parsed.grossSalary),
    sourceModule: "payroll",
    sourceRecordId: data.id,
    publishNow: true,
  });

  return data.id;
}

export async function syncActiveEmployeesIntoPayrollRun(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<void> {
  const organizationId = profile.employee.organizationId;
  const { data: payroll, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, organization_id, payroll_month, is_locked")
    .eq("id", payrollId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payroll || payroll.is_locked) return;

  const [{ data: existingItems, error: itemsError }, employees] = await Promise.all([
    supabase
      .schema("hrms")
      .from("payroll_items")
      .select("employee_id")
      .eq("payroll_id", payrollId)
      .is("deleted_at", null),
    getActiveEmployees(supabase, organizationId),
  ]);

  if (itemsError) throw new Error(itemsError.message);

  const existingIds = new Set((existingItems ?? []).map((row) => row.employee_id));
  const missing = employees.filter((employee) => !existingIds.has(employee.id));
  if (missing.length === 0) return;

  const monthDate = new Date(`${String(payroll.payroll_month).slice(0, 10)}T00:00:00.000Z`);
  const month = monthDate.getUTCMonth() + 1;
  const year = monthDate.getUTCFullYear();
  const payrollSettings = await getPayrollSettings(supabase, organizationId);
  const facts = await loadPayrollPeriodFacts(
    supabase,
    missing.map((employee) => employee.id),
    month,
    year,
  );
  const actorId = actorUserId(profile);
  const calcSettings = {
    workingDaysCalculation: payrollSettings.settings.workingDaysCalculation,
    lossOfPayDeduction: payrollSettings.settings.leaveIntegration.lossOfPayDeduction,
    halfDayDeduction: payrollSettings.settings.leaveIntegration.halfDayDeduction,
    paidLeaveDeduction: payrollSettings.settings.leaveIntegration.paidLeaveDeduction,
  };

  const rows = missing.map((employee) => {
    const salaryStructure = facts.structuresByEmployee.get(employee.id) ?? null;
    const calc = calculateEmployeePayroll({
      month,
      year,
      salaryStructure,
      attendance: facts.attendanceByEmployee.get(employee.id) ?? emptyAttendanceSummary(),
      leaveSummary: facts.leaveByEmployee.get(employee.id) ?? { lopDays: 0, paidLeaveDays: 0 },
      bonuses: facts.bonusesByEmployee.get(employee.id) ?? [],
      reimbursements: facts.reimbursementsByEmployee.get(employee.id) ?? [],
      settings: calcSettings,
    });
    return {
      payroll_id: payrollId,
      employee_id: employee.id,
      salary_structure_id: salaryStructure?.id ?? null,
      basic_salary: calc.basicSalary,
      total_allowances: calc.totalAllowances,
      total_deductions: calc.totalDeductions,
      gross_salary: calc.grossSalary,
      net_salary: calc.netSalary,
      breakdown: calc.breakdown,
      created_by: actorId,
      updated_by: actorId,
    };
  });

  const { error: insertError } = await supabase.schema("hrms").from("payroll_items").insert(rows);
  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }

  const { data: totals } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select("gross_salary, total_deductions, net_salary")
    .eq("payroll_id", payrollId)
    .is("deleted_at", null);

  await supabase
    .schema("hrms")
    .from("payrolls")
    .update({
      total_gross: roundCurrency(
        (totals ?? []).reduce((sum, row) => sum + Number(row.gross_salary ?? 0), 0),
      ),
      total_deductions: roundCurrency(
        (totals ?? []).reduce((sum, row) => sum + Number(row.total_deductions ?? 0), 0),
      ),
      total_net: roundCurrency(
        (totals ?? []).reduce((sum, row) => sum + Number(row.net_salary ?? 0), 0),
      ),
      updated_by: actorId,
    })
    .eq("id", payrollId);
}

export async function getPayrollRunById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payrollId: string,
): Promise<PayrollDetail | null> {
  const organizationId = profile.employee.organizationId;

  const { data: payroll, error } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("*")
    .eq("id", payrollId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payroll) return null;

  const { data: items, error: itemsError } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      `
        id,
        employee_id,
        basic_salary,
        total_allowances,
        total_deductions,
        gross_salary,
        net_salary,
        breakdown,
        employees (
          employee_code,
          first_name,
          last_name,
          departments:department_id (name),
          designations:designation_id (title),
          employment_types:employment_type_id (name)
        ),
        payslips (id, email_sent_at, published_at)
      `,
    )
    .eq("payroll_id", payrollId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  const { data: approvals, error: approvalsError } = await supabase
    .schema("hrms")
    .from("payroll_approvals")
    .select(
      `
        id,
        approval_level,
        approval_status,
        approver_employee_id,
        comments,
        acted_at,
        employees:approver_employee_id (first_name, last_name)
      `,
    )
    .eq("payroll_id", payrollId)
    .is("deleted_at", null)
    .order("approval_level", { ascending: true });

  if (approvalsError) throw new Error(approvalsError.message);

  const visibleItems = (items ?? []).flatMap((row) => {
      const employee = unwrapRelation(row.employees);
      const designation = employee
        ? unwrapRelation(
            employee.designations as { title: string } | { title: string }[] | null,
          )
        : null;
      if (
        employee &&
        isExcludedFromTeamPayslips(employee.employee_code, {
          employeeCode: employee.employee_code,
          firstName: employee.first_name,
          lastName: employee.last_name,
          designationTitle: designation?.title ?? null,
        })
      ) {
        return [];
      }
      const department = employee
        ? unwrapRelation(
            employee.departments as { name: string } | { name: string }[] | null,
          )
        : null;
      const employmentType = employee
        ? unwrapRelation(
            employee.employment_types as { name: string } | { name: string }[] | null,
          )
        : null;
      const payslip = unwrapRelation(
        row.payslips as
          | { id: string; email_sent_at: string | null; published_at?: string | null }
          | { id: string; email_sent_at: string | null; published_at?: string | null }[]
          | null,
      );
      const breakdown = (row.breakdown as PayrollBreakdown) ?? {
        earnings: [],
        deductions: [],
        attendance: {
          workingDays: 0,
          presentDays: 0,
          absentDays: 0,
          lopDays: 0,
          leaveLopDays: 0,
          overtimeHours: 0,
        },
      };
      const payslipSent =
        Boolean(payslip?.email_sent_at) ||
        Boolean(
          payslip?.published_at && isPayslipPublishedToEmployee(payslip.published_at),
        ) ||
        breakdown.payrollLifecycle?.itemStatus === "sent";
      const itemStatus = payslipSent
        ? "sent"
        : breakdown.payrollLifecycle?.itemStatus ?? "draft";
      return [{
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "",
        departmentName: department?.name ?? null,
        designationTitle: designation?.title ?? null,
        employmentTypeName: employmentType?.name ?? null,
        basicSalary: Number(row.basic_salary),
        totalAllowances: Number(row.total_allowances),
        totalDeductions: Number(row.total_deductions),
        grossSalary: Number(row.gross_salary),
        netSalary: Number(row.net_salary),
        breakdown,
        hasSalaryStructure: Boolean(
          breakdown.salaryStructureSnapshot?.salaryStructureId ||
            Number(row.basic_salary) > 0,
        ),
        itemStatus,
        payslipSent,
        payslipId: payslip?.id ?? null,
      }];
  });

  return {
    id: payroll.id,
    payrollMonth: payroll.payroll_month,
    payrollStatus: payroll.payroll_status,
    totalGross: visibleItems.reduce((sum, item) => sum + item.grossSalary, 0),
    totalDeductions: visibleItems.reduce((sum, item) => sum + item.totalDeductions, 0),
    totalNet: visibleItems.reduce((sum, item) => sum + item.netSalary, 0),
    isLocked: Boolean(payroll.is_locked),
    notes: payroll.notes,
    processedAt: payroll.processed_at,
    approvedAt: payroll.approved_at,
    items: visibleItems,
    approvals: (approvals ?? []).map((row) => {
      const approver = unwrapRelation(
        row.employees as
          | { first_name: string; last_name: string }
          | { first_name: string; last_name: string }[]
          | null,
      );
      return {
        id: row.id,
        approvalLevel: row.approval_level,
        approvalStatus: row.approval_status,
        approverEmployeeId: row.approver_employee_id,
        approverName: approver
          ? `${approver.first_name} ${approver.last_name}`
          : "",
        comments: row.comments,
        actedAt: row.acted_at,
      };
    }),
  };
}

export async function getPayslipById(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  payslipId: string,
  options?: { bypassAccessCheck?: boolean },
): Promise<PayslipDetail | null> {
  const organizationId = profile.employee.organizationId;

  const { data: payslip, error } = await supabase
    .schema("hrms")
    .from("payslips")
    .select(
      `
        id,
        payslip_number,
        issued_at,
        employee_id,
        storage_path,
        salary_credit_date,
        published_at,
        payroll_generated_at,
        payment_mode,
        transaction_reference,
        payslip_version,
        payroll_items:payroll_item_id (
          basic_salary,
          total_allowances,
          total_deductions,
          gross_salary,
          net_salary,
          breakdown,
          salary_structure_id
        ),
        payrolls:payroll_id (
          payroll_month,
          payroll_status,
          organization_id,
          processed_at,
          organizations:organization_id (name)
        ),
        employees:employee_id (
          employee_code,
          first_name,
          last_name,
          email,
          date_of_joining,
          organization_id,
          departments:department_id (name),
          designations:designation_id (title),
          branches:branch_id (name),
          employment_types:employment_type_id (name)
        )
      `,
    )
    .eq("id", payslipId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!payslip) return null;

  const employee = unwrapRelation(payslip.employees);
  const payroll = unwrapRelation(payslip.payrolls);
  const payrollItem = unwrapRelation(payslip.payroll_items);

  if (!employee || !payroll || employee.organization_id !== organizationId) {
    return null;
  }

  const payrollSettings = await getPayrollSettings(supabase, organizationId);
  const schedule = resolvePayslipSchedule(
    payroll.payroll_month,
    {
      salaryCreditDate: payslip.salary_credit_date ?? undefined,
      publishedAt: payslip.published_at ?? undefined,
    },
    {
      salaryCreditDay: payrollSettings.settings.salaryCreditDate,
      publishDay: payrollSettings.settings.payslipAvailableDay,
    },
  );

  const isOwnPayslip = payslip.employee_id === profile.employee.id;
  const access = resolvePayslipAvailability(
    schedule.publishedAt,
    profile.permissionCodes,
    new Date(),
    { employeeFacing: isOwnPayslip },
  );

  if (
    !options?.bypassAccessCheck &&
    !access.canEmployeeAccess &&
    !(
      !isOwnPayslip && canAccessPayslipDuringReview(profile.permissionCodes)
    )
  ) {
    return null;
  }

  const department = unwrapRelation(
    employee.departments as { name: string } | { name: string }[] | null,
  );
  const designation = unwrapRelation(
    employee.designations as { title: string } | { title: string }[] | null,
  );
  const branch = unwrapRelation(
    employee.branches as { name: string } | { name: string }[] | null,
  );
  const employmentType = unwrapRelation(
    employee.employment_types as { name: string } | { name: string }[] | null,
  );

  const { data: bankAccount } = await supabase
    .schema("hrms")
    .from("bank_accounts")
    .select("bank_name, account_number, ifsc_code, account_holder_name")
    .eq("employee_id", payslip.employee_id)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();

  // Prefer payroll_item.breakdown snapshot — never recompute historical amounts from live salary.
  const breakdown = (payrollItem?.breakdown as PayrollBreakdown) ?? {
    earnings: [],
    deductions: [],
    attendance: {
      workingDays: 0,
      presentDays: 0,
      absentDays: 0,
      lopDays: 0,
      leaveLopDays: 0,
      overtimeHours: 0,
    },
  };

  const components = await resolvePayslipSalaryComponents(
    supabase,
    payslip.employee_id,
    payroll.payroll_month,
    payrollItem?.salary_structure_id as string | null | undefined,
    breakdown,
  );
  const statutory = parseStatutoryIds(components);
  const branding = await getPayslipBranding(supabase, organizationId);

  const employerContributions = buildEmployerContributions(components, breakdown);
  const employerContributionTotal = employerContributions.reduce(
    (sum, line) => sum + line.amount,
    0,
  );

  const payrollMonthDate = new Date(payroll.payroll_month);
  const payrollYear = Number.isNaN(payrollMonthDate.getTime())
    ? new Date().getFullYear()
    : payrollMonthDate.getFullYear();
  const payrollMonthNum = Number.isNaN(payrollMonthDate.getTime())
    ? new Date().getMonth() + 1
    : payrollMonthDate.getMonth() + 1;
  const leaveMonthKey = `${payrollYear}-${String(payrollMonthNum).padStart(2, "0")}-01`;

  const leaveBalances: PayslipDetail["leaveBalances"] = {
    casual: { usedInMonth: 0, balance: 0 },
    earned: { usedInMonth: 0, balance: 0 },
  };
  try {
    const leaveSnapshots = await getEmployeeLeaveBalanceSnapshot(
      supabase,
      payslip.employee_id,
      getCurrentBalanceYear(leaveMonthKey),
      { month: payrollMonthNum, year: payrollYear },
      organizationId,
    );
    for (const code of LEAVE_BALANCE_CARD_CODES) {
      const row = leaveSnapshots.find((item) => item.leaveTypeCode === code);
      if (!row) continue;
      const entry = {
        usedInMonth: Number(row.monthUsedDays) || 0,
        balance: Number(row.balanceDays) || 0,
      };
      if (code === "CL") leaveBalances.casual = entry;
      if (code === "EL") leaveBalances.earned = entry;
    }
  } catch {
    // Leave snapshot is display-only; never block payslip load.
  }

  const detail: PayslipDetail = {
    id: payslip.id,
    payslipNumber: payslip.payslip_number,
    issuedAt: payslip.issued_at,
    payrollMonth: payroll.payroll_month,
    payrollStatus: payroll.payroll_status,
    salaryCreditDate: schedule.salaryCreditDate,
    publishedAt: schedule.publishedAt,
    payrollGeneratedAt:
      payslip.payroll_generated_at ?? payroll.processed_at ?? payslip.issued_at,
    paymentMode: payslip.payment_mode ?? "Bank Transfer",
    transactionReference: payslip.transaction_reference ?? null,
    payslipVersion: payslip.payslip_version ?? PAYSLIP_VERSION,
    availability: access.availability,
    canEmployeeAccess: access.canEmployeeAccess,
    reviewMessage: access.reviewMessage,
    employee: {
      id: payslip.employee_id,
      employeeCode: employee.employee_code,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      departmentName: department?.name ?? null,
      designationTitle: designation?.title ?? null,
      employmentType: employmentType?.name ?? null,
      branchName: branch?.name ?? null,
      dateOfJoining: employee.date_of_joining,
      pan: statutory.pan,
      uan: statutory.uan,
      pfNumber: statutory.pfNumber,
    },
    organization: {
      name: branding.companyName,
      addressLines: branding.addressLines,
      logoUrl: branding.logoUrl,
      email: branding.email,
      phone: branding.phone,
      footerMessage: branding.footerMessage,
      gstNumber: branding.gstNumber,
      cin: branding.cin,
    },
    currencyCode: branding.currencyCode,
    basicSalary: Number(payrollItem?.basic_salary ?? 0),
    totalAllowances: Number(payrollItem?.total_allowances ?? 0),
    totalDeductions: Number(payrollItem?.total_deductions ?? 0),
    grossSalary: Number(payrollItem?.gross_salary ?? 0),
    netSalary: Number(payrollItem?.net_salary ?? 0),
    totalEarnings: 0,
    employerContributionTotal,
    breakdown,
    employerContributions,
    bankAccount: bankAccount
      ? {
          bankName: bankAccount.bank_name,
          accountNumberMasked: maskAccountNumber(bankAccount.account_number),
          ifscCode: bankAccount.ifsc_code ?? null,
          accountHolderName: bankAccount.account_holder_name ?? null,
        }
      : null,
    leaveBalances,
    storagePath: payslip.storage_path ?? null,
  };

  detail.totalEarnings = totalEarnings(detail);
  return detail;
}
