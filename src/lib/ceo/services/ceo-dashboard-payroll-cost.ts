import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  isPayrollEligibleEmployee,
  type PayrollIntegrityEmployee,
} from "@/lib/payroll/payroll-integrity";
import { buildPayrollPreview } from "@/lib/payroll/services/payroll-mutations";
import {
  getMonthDateRange,
  getPayrollMonthDate,
  roundCurrency,
  sumPayrollFinalPayableTotals,
} from "@/lib/payroll/services/payroll-utils";
import type { UserProfile } from "@/types/auth";
import type { PayrollBreakdown } from "@/types/payroll";

const CLOSED_PAYROLL_ITEM_SELECT = `
  employee_id,
  basic_salary,
  total_allowances,
  total_deductions,
  gross_salary,
  net_salary,
  breakdown,
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

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function employeeFromPayrollItemJoin(
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

/**
 * CEO Dashboard Payroll Cost — same employee population and Final Payable formula
 * as Team Payroll (attendance-driven calculator + approved extras).
 *
 * When a Team Payroll run already exists for the month, use persisted payroll_items
 * Final Payable (same values Team Payroll / payslips show). Live preview is only
 * used when no run has been created yet.
 */
export async function getCeoDashboardPayrollCost(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  month?: number,
  year?: number,
): Promise<number> {
  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();
  const organizationId = profile.employee.organizationId;
  const payrollMonth = getPayrollMonthDate(targetMonth, targetYear);

  const { data: currentPayroll, error: payrollError } = await supabase
    .schema("hrms")
    .from("payrolls")
    .select("id, payroll_status, is_locked")
    .eq("organization_id", organizationId)
    .eq("payroll_month", payrollMonth)
    .is("deleted_at", null)
    .maybeSingle();

  if (payrollError) throw new Error(payrollError.message);

  if (!currentPayroll) {
    const preview = await buildPayrollPreview(supabase, profile, {
      month: targetMonth,
      year: targetYear,
    });

    const payableItems = preview.items.map((item) => ({
      basicSalary: item.basicSalary,
      grossSalary: item.grossSalary,
      netSalary: item.netSalary,
      totalDeductions: item.totalDeductions,
      totalAllowances: item.totalAllowances,
      breakdown: item.breakdown,
    }));

    return sumPayrollFinalPayableTotals(payableItems).totalFinalPayable;
  }

  const { data: items, error: itemsError } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(CLOSED_PAYROLL_ITEM_SELECT)
    .eq("payroll_id", currentPayroll.id)
    .is("deleted_at", null);

  if (itemsError) throw new Error(itemsError.message);

  const periodEnd = getMonthDateRange(targetMonth, targetYear).endDate;
  const seenEmployeeIds = new Set<string>();
  const payableItems: Array<{
    basicSalary: number;
    grossSalary: number;
    netSalary: number;
    totalDeductions: number;
    totalAllowances: number;
    breakdown: PayrollBreakdown | null;
  }> = [];

  for (const item of items ?? []) {
    const employeeId = String(item.employee_id);
    if (seenEmployeeIds.has(employeeId)) continue;

    const employee = employeeFromPayrollItemJoin(
      item.employees as Parameters<typeof employeeFromPayrollItemJoin>[0],
    );
    if (!isPayrollEligibleEmployee(employee, periodEnd)) continue;

    seenEmployeeIds.add(employeeId);
    payableItems.push({
      basicSalary: Number(item.basic_salary ?? 0),
      grossSalary: Number(item.gross_salary ?? 0),
      netSalary: Number(item.net_salary ?? 0),
      totalDeductions: Number(item.total_deductions ?? 0),
      totalAllowances: Number(item.total_allowances ?? 0),
      breakdown: (item.breakdown as PayrollBreakdown | null) ?? null,
    });
  }

  return roundCurrency(sumPayrollFinalPayableTotals(payableItems).totalFinalPayable);
}
