import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { resolveLeaveEligibilityBand } from "@/lib/leave/leave-eligibility";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import { roundLeaveDays } from "@/lib/leave/services/leave-usage";

/** Casual Leave and Earned Leave each accrue 1 day per calendar month. */
export const MONTHLY_ACCRUAL_LEAVE_CODES = ["CL", "EL"] as const;

export const MONTHLY_ACCRUAL_DAYS_PER_MONTH = 1;

export function isMonthlyAccrualLeaveCode(code: string | null | undefined): boolean {
  return MONTHLY_ACCRUAL_LEAVE_CODES.includes(
    String(code ?? "").toUpperCase() as (typeof MONTHLY_ACCRUAL_LEAVE_CODES)[number],
  );
}

/** First day of the calendar month for a YYYY-MM-DD (or Date). */
export function monthStartDate(date = getTodayDateString()): string {
  return `${date.slice(0, 7)}-01`;
}

/** Whole months from fromMonthStart (inclusive of next) up to toMonthStart (exclusive of to?).
 * Returns how many +1 accruals are due when last accrued was `from` and we need through `to` (both YYYY-MM-01).
 */
export function monthsBetweenMonthStarts(fromMonthStart: string, toMonthStart: string): number {
  const [fy, fm] = fromMonthStart.slice(0, 7).split("-").map(Number);
  const [ty, tm] = toMonthStart.slice(0, 7).split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

type BalanceAccrualRow = {
  id: string;
  allocated_days: number | string;
  used_days: number | string;
  pending_days: number | string;
  balance_days: number | string;
  accrued_through_month: string | null;
  leave_types: { code: string } | { code: string }[] | null;
};

function unwrapCode(
  leaveTypes: BalanceAccrualRow["leave_types"],
): string | null {
  if (!leaveTypes) return null;
  if (Array.isArray(leaveTypes)) return leaveTypes[0]?.code ?? null;
  return leaveTypes.code ?? null;
}

/**
 * Idempotently applies monthly +1 accruals for CL and EL through the current month.
 * Refreshing the page never double-grants: updates are gated on accrued_through_month.
 */
export async function ensureEmployeeMonthlyLeaveAccruals(
  supabase: AuthSupabaseClient,
  employeeId: string,
  options?: { balanceYear?: number; asOfDate?: string; actorUserId?: string | null },
): Promise<void> {
  const asOf = options?.asOfDate ?? getTodayDateString();
  const balanceYear = options?.balanceYear ?? getCurrentBalanceYear(asOf);
  const currentMonthStart = monthStartDate(asOf);

  const { data: employeeRow } = await supabase
    .schema("hrms")
    .from("employees")
    .select("employment_status, date_of_joining, employment_types:employment_type_id (code, is_full_time)")
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  const typeRaw = employeeRow?.employment_types as
    | { code?: string | null; is_full_time?: boolean | null }
    | { code?: string | null; is_full_time?: boolean | null }[]
    | null
    | undefined;
  const typeRow = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;
  const leaveEligibilityBand = resolveLeaveEligibilityBand({
    employmentStatus: String(employeeRow?.employment_status ?? "active"),
    employmentTypeCode: typeRow?.code ?? null,
    isFullTime: typeof typeRow?.is_full_time === "boolean" ? typeRow.is_full_time : null,
  });

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .select(
      `id, allocated_days, used_days, pending_days, balance_days, accrued_through_month,
       leave_types:leave_type_id (code)`,
    )
    .eq("employee_id", employeeId)
    .eq("balance_year", balanceYear)
    .is("deleted_at", null);

  if (error) {
    console.error("[leave] monthly accrual load failed", error.message);
    return;
  }

  for (const row of (data ?? []) as BalanceAccrualRow[]) {
    const code = unwrapCode(row.leave_types);
    if (!isMonthlyAccrualLeaveCode(code)) continue;

    // Intern / probation employees do not accrue Earned Leave.
    if (leaveEligibilityBand === "cl_only" && code === "EL") continue;

    const accruedThrough = row.accrued_through_month
      ? String(row.accrued_through_month).slice(0, 10)
      : null;

    // First time this row is on monthly accrual: keep used/pending, credit this month only.
    if (!accruedThrough) {
      const used = Math.max(0, Number(row.used_days));
      const pending = Math.max(0, Number(row.pending_days));
      const allocated = roundLeaveDays(used + pending + MONTHLY_ACCRUAL_DAYS_PER_MONTH);
      const balanceDays = roundLeaveDays(Math.max(0, allocated - used - pending));

      const { error: baselineError } = await supabase
        .schema("hrms")
        .from("leave_balances")
        .update({
          allocated_days: allocated,
          balance_days: balanceDays,
          accrued_through_month: currentMonthStart,
          updated_at: new Date().toISOString(),
          ...(options?.actorUserId ? { updated_by: options.actorUserId } : {}),
        })
        .eq("id", row.id)
        .is("deleted_at", null)
        .is("accrued_through_month", null);

      if (baselineError) {
        console.error("[leave] monthly accrual baseline failed", baselineError.message);
      }
      continue;
    }

    const monthsDue = monthsBetweenMonthStarts(accruedThrough, currentMonthStart);
    if (monthsDue <= 0) continue;

    const addDays = roundLeaveDays(monthsDue * MONTHLY_ACCRUAL_DAYS_PER_MONTH);
    const allocated = roundLeaveDays(Number(row.allocated_days) + addDays);
    const used = Number(row.used_days);
    const pending = Number(row.pending_days);
    const balanceDays = roundLeaveDays(allocated - used - pending);

    const { error: updateError } = await supabase
      .schema("hrms")
      .from("leave_balances")
      .update({
        allocated_days: allocated,
        balance_days: balanceDays,
        accrued_through_month: currentMonthStart,
        updated_at: new Date().toISOString(),
        ...(options?.actorUserId ? { updated_by: options.actorUserId } : {}),
      })
      .eq("id", row.id)
      .eq("accrued_through_month", accruedThrough)
      .is("deleted_at", null);

    if (updateError) {
      console.error("[leave] monthly accrual update failed", updateError.message);
    }
  }
}

/**
 * Opening allocated days when creating a new CL/EL row for a year.
 * Carries forward previous year remaining balance when present, then adds
 * the current month's accrual (+1). Does not backfill earlier months for
 * brand-new employees (they start at 1 for the current month).
 */
export async function resolveMonthlyAccrualOpeningAllocation(
  supabase: AuthSupabaseClient,
  employeeId: string,
  leaveTypeId: string,
  balanceYear: number,
  asOfDate = getTodayDateString(),
): Promise<{ allocatedDays: number; accruedThroughMonth: string }> {
  const currentMonthStart = monthStartDate(asOfDate);

  let carried = 0;
  if (balanceYear > 2000) {
    const { data: previous } = await supabase
      .schema("hrms")
      .from("leave_balances")
      .select("balance_days")
      .eq("employee_id", employeeId)
      .eq("leave_type_id", leaveTypeId)
      .eq("balance_year", balanceYear - 1)
      .is("deleted_at", null)
      .maybeSingle();

    if (previous) {
      carried = Math.max(0, Number(previous.balance_days) || 0);
    }
  }

  const allocatedDays = roundLeaveDays(carried + MONTHLY_ACCRUAL_DAYS_PER_MONTH);
  return { allocatedDays, accruedThroughMonth: currentMonthStart };
}
