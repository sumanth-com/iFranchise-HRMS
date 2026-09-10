import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMonthDateRange, roundCurrency } from "@/lib/payroll/services/payroll-utils";

export type ApprovedReimbursementClaim = {
  id: string;
  employeeId: string;
  amount: number;
  category: string;
  expenseDate: string;
  payrollId: string | null;
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Canonical period filter: approved claims by expense_date in the payroll month.
 * Includes claims already attached to a payroll run so recalculation does not drop them.
 */
export async function listApprovedReimbursementsForPeriod(
  _supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    employeeId?: string;
    employeeIds?: string[];
    month: number;
    year: number;
  },
): Promise<ApprovedReimbursementClaim[]> {
  const { startDate, endDate } = getMonthDateRange(input.month, input.year);
  const admin = createAdminClient();

  let query = admin
    .schema("hrms")
    .from("employee_reimbursements")
    .select("id, employee_id, amount, category, expense_date, payroll_id")
    .eq("organization_id", input.organizationId)
    .eq("reimbursement_status", "approved")
    .is("deleted_at", null)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate);

  if (input.employeeId) {
    query = query.eq("employee_id", input.employeeId);
  } else if (input.employeeIds && input.employeeIds.length > 0) {
    query = query.in("employee_id", input.employeeIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const byId = new Map<string, ApprovedReimbursementClaim>();
  for (const row of data ?? []) {
    const id = String(row.id);
    if (byId.has(id)) continue;
    byId.set(id, {
      id,
      employeeId: String(row.employee_id),
      amount: roundCurrency(num(row.amount)),
      category: String(row.category ?? "other"),
      expenseDate: String(row.expense_date).slice(0, 10),
      payrollId: row.payroll_id ? String(row.payroll_id) : null,
    });
  }
  return Array.from(byId.values());
}

/** Shared total used by Team Payroll, payslip calc inputs, and reimbursement sync. */
export async function getApprovedReimbursementTotal(
  supabase: AuthSupabaseClient,
  employeeId: string,
  month: number,
  year: number,
  options?: { organizationId?: string },
): Promise<number> {
  let organizationId = options?.organizationId;
  if (!organizationId) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .schema("hrms")
      .from("employees")
      .select("organization_id")
      .eq("id", employeeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    organizationId = data?.organization_id ? String(data.organization_id) : undefined;
  }
  if (!organizationId) return 0;

  const claims = await listApprovedReimbursementsForPeriod(supabase, {
    organizationId,
    employeeId,
    month,
    year,
  });
  return roundCurrency(claims.reduce((sum, claim) => sum + claim.amount, 0));
}

export function sumApprovedReimbursementAmounts(
  claims: Array<{ amount: number | string }>,
): number {
  return roundCurrency(claims.reduce((sum, claim) => sum + num(claim.amount), 0));
}

export function toCalculatorReimbursementRows(
  claims: Array<{ amount: number | string; category: string }>,
): Array<{ amount: number; category: string }> {
  return claims.map((claim) => ({
    amount: roundCurrency(num(claim.amount)),
    category: String(claim.category ?? "other"),
  }));
}
