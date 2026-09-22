import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { resolveInternProbationClEntitlement } from "@/lib/leave/leave-entitlement";
import { resolveLeaveEligibilityBand } from "@/lib/leave/leave-eligibility";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import { paidDaysFromLeaveRequest, roundLeaveDays } from "@/lib/leave/services/leave-usage";

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

/** Whole months from fromMonthStart up to toMonthStart (exclusive of to as a count of steps). */
export function monthsBetweenMonthStarts(fromMonthStart: string, toMonthStart: string): number {
  const [fy, fm] = fromMonthStart.slice(0, 7).split("-").map(Number);
  const [ty, tm] = toMonthStart.slice(0, 7).split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * Inclusive monthly credits earned in `balanceYear` through `asOfDate`.
 * Starts at the later of year-start and joining month. Does not backfill years
 * before the employee joined.
 */
export function countMonthlyAccrualCredits(input: {
  joiningDate: string | null | undefined;
  balanceYear: number;
  asOfDate: string;
}): number {
  const asOf = input.asOfDate.slice(0, 10);
  const yearStart = `${input.balanceYear}-01-01`;
  if (asOf < yearStart) return 0;

  let creditFrom = yearStart;
  if (input.joiningDate) {
    const join = input.joiningDate.slice(0, 10);
    if (join > asOf) return 0;
    const joinMonthStart = monthStartDate(join);
    if (joinMonthStart > creditFrom) creditFrom = joinMonthStart;
  }

  const creditThrough = monthStartDate(asOf);
  if (creditThrough < creditFrom) return 0;
  return monthsBetweenMonthStarts(creditFrom, creditThrough) + 1;
}

/**
 * Expected allocated days for a CL/EL ledger row:
 * - +1 per eligible month in the balance year through as-of (capped at daysPerYear)
 * - EL only: plus remaining balance carried from the previous year
 * CL does not carry across calendar years (unused CL expires on 31 Dec).
 */
export function resolveExpectedMonthlyAccrualAllocatedDays(input: {
  leaveTypeCode: string;
  joiningDate: string | null | undefined;
  balanceYear: number;
  asOfDate: string;
  daysPerYear: number;
  carriedFromPreviousYear?: number;
}): number {
  const code = String(input.leaveTypeCode ?? "").toUpperCase();
  const yearCap = Math.max(0, Number(input.daysPerYear) || 0);
  const credits = countMonthlyAccrualCredits({
    joiningDate: input.joiningDate,
    balanceYear: input.balanceYear,
    asOfDate: input.asOfDate,
  });
  const yearCredits =
    yearCap > 0 ? Math.min(credits, yearCap) : credits * MONTHLY_ACCRUAL_DAYS_PER_MONTH;
  const carried =
    code === "EL" ? Math.max(0, Number(input.carriedFromPreviousYear) || 0) : 0;
  return roundLeaveDays(carried + yearCredits);
}

/**
 * EL remaining from before `balanceYear`.
 * Always derives policy-earned remaining from joining-month credits minus paid EL
 * usage. A prior-year ledger balance may reduce carry further but can never inflate
 * it above policy (blocks seeded annual pools from carrying into the new year).
 * CL never carries.
 */
export function resolveExpectedEarnedLeaveCarryForward(input: {
  joiningDate: string | null | undefined;
  balanceYear: number;
  daysPerYear: number;
  previousYearLedgerBalance?: number | null;
  previousYearPaidUsedDays?: number;
}): number {
  if (!input.joiningDate || input.balanceYear <= 2000) return 0;
  const join = input.joiningDate.slice(0, 10);
  if (Number(join.slice(0, 4)) >= input.balanceYear) return 0;

  const prevYear = input.balanceYear - 1;
  const expectedPrevCredits = resolveExpectedMonthlyAccrualAllocatedDays({
    leaveTypeCode: "EL",
    joiningDate: input.joiningDate,
    balanceYear: prevYear,
    asOfDate: `${prevYear}-12-31`,
    daysPerYear: input.daysPerYear || 12,
    // Immediate prior year only — no recursive seeded carry into the derivation.
    carriedFromPreviousYear: 0,
  });
  const paidUsed = Math.max(0, Number(input.previousYearPaidUsedDays) || 0);
  const policyRemaining = roundLeaveDays(Math.max(0, expectedPrevCredits - paidUsed));

  if (
    input.previousYearLedgerBalance != null &&
    Number.isFinite(Number(input.previousYearLedgerBalance))
  ) {
    return roundLeaveDays(
      Math.min(Math.max(0, Number(input.previousYearLedgerBalance)), policyRemaining),
    );
  }

  return policyRemaining;
}

type BalanceAccrualRow = {
  id: string;
  leave_type_id: string;
  allocated_days: number | string;
  used_days: number | string;
  pending_days: number | string;
  balance_days: number | string;
  accrued_through_month: string | null;
  leave_types:
    | { code: string; days_per_year?: number | string | null }
    | { code: string; days_per_year?: number | string | null }[]
    | null;
};

function unwrapLeaveType(leaveTypes: BalanceAccrualRow["leave_types"]): {
  code: string | null;
  daysPerYear: number;
} {
  if (!leaveTypes) return { code: null, daysPerYear: 0 };
  const row = Array.isArray(leaveTypes) ? leaveTypes[0] : leaveTypes;
  return {
    code: row?.code ?? null,
    daysPerYear: Math.max(0, Number(row?.days_per_year ?? 0)),
  };
}

/**
 * Idempotently sets CL/EL allocated days to the policy-correct YTD monthly credit
 * (plus EL carry-forward). Refreshing never double-grants: allocated is reconciled
 * to the expected value for the as-of month, not incremented blindly on top of a
 * days_per_year seed.
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
    .select(
      "employment_status, date_of_joining, employment_types:employment_type_id (code, is_full_time)",
    )
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  const employmentStatus = String(employeeRow?.employment_status ?? "active");
  const typeRaw = employeeRow?.employment_types as
    | { code?: string | null; is_full_time?: boolean | null }
    | { code?: string | null; is_full_time?: boolean | null }[]
    | null
    | undefined;
  const typeRow = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;
  const leaveEligibilityBand = resolveLeaveEligibilityBand({
    employmentStatus,
    employmentTypeCode: typeRow?.code ?? null,
    isFullTime: typeof typeRow?.is_full_time === "boolean" ? typeRow.is_full_time : null,
  });
  const joiningDate = (employeeRow?.date_of_joining as string | null) ?? null;

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .select(
      `id, leave_type_id, allocated_days, used_days, pending_days, balance_days, accrued_through_month,
       leave_types:leave_type_id (code, days_per_year)`,
    )
    .eq("employee_id", employeeId)
    .eq("balance_year", balanceYear)
    .is("deleted_at", null);

  if (error) {
    console.error("[leave] monthly accrual load failed", error.message);
    return;
  }

  const now = new Date().toISOString();

  for (const row of (data ?? []) as BalanceAccrualRow[]) {
    const { code, daysPerYear } = unwrapLeaveType(row.leave_types);
    if (!isMonthlyAccrualLeaveCode(code) || !code) continue;

    const used = Math.max(0, Number(row.used_days));
    const pending = Math.max(0, Number(row.pending_days));

    // Intern / probation: no EL; CL is monthly (0 in month 1), not a YTD seed.
    if (leaveEligibilityBand === "cl_only") {
      if (code === "EL") {
        const allocated = roundLeaveDays(Math.max(0, used + pending));
        const balanceDays = roundLeaveDays(Math.max(0, allocated - used - pending));
        const accruedThrough = row.accrued_through_month
          ? String(row.accrued_through_month).slice(0, 10)
          : null;
        const same =
          roundLeaveDays(Number(row.allocated_days)) === allocated &&
          roundLeaveDays(Number(row.balance_days)) === balanceDays &&
          accruedThrough === currentMonthStart;
        if (!same) {
          const { error: updateError } = await supabase
            .schema("hrms")
            .from("leave_balances")
            .update({
              allocated_days: allocated,
              balance_days: balanceDays,
              accrued_through_month: currentMonthStart,
              updated_at: now,
              ...(options?.actorUserId ? { updated_by: options.actorUserId } : {}),
            })
            .eq("id", row.id)
            .is("deleted_at", null);
          if (updateError) {
            console.error("[leave] monthly accrual EL clear failed", updateError.message);
          }
        }
        continue;
      }

      if (code === "CL") {
        const entitlement = resolveInternProbationClEntitlement({
          joiningDate,
          employmentStatus,
          leaveEligibilityBand,
          asOfDate: asOf,
        });
        const monthly = entitlement?.monthlyEntitlement ?? 0;
        const allocated = roundLeaveDays(Math.max(monthly, used + pending));
        const balanceDays = roundLeaveDays(Math.max(0, allocated - used - pending));
        const accruedThrough = row.accrued_through_month
          ? String(row.accrued_through_month).slice(0, 10)
          : null;
        const same =
          roundLeaveDays(Number(row.allocated_days)) === allocated &&
          roundLeaveDays(Number(row.balance_days)) === balanceDays &&
          accruedThrough === currentMonthStart;
        if (!same) {
          const { error: updateError } = await supabase
            .schema("hrms")
            .from("leave_balances")
            .update({
              allocated_days: allocated,
              balance_days: balanceDays,
              accrued_through_month: currentMonthStart,
              updated_at: now,
              ...(options?.actorUserId ? { updated_by: options.actorUserId } : {}),
            })
            .eq("id", row.id)
            .is("deleted_at", null);
          if (updateError) {
            console.error("[leave] monthly accrual CL intern reconcile failed", updateError.message);
          }
        }
        continue;
      }
    }

    let previousYearLedgerBalance: number | null = null;
    let previousYearPaidUsedDays = 0;
    if (code === "EL" && balanceYear > 2000) {
      const prevYear = balanceYear - 1;
      const [{ data: previous }, { data: prevRequests }] = await Promise.all([
        supabase
          .schema("hrms")
          .from("leave_balances")
          .select("balance_days")
          .eq("employee_id", employeeId)
          .eq("leave_type_id", row.leave_type_id)
          .eq("balance_year", prevYear)
          .is("deleted_at", null)
          .maybeSingle(),
        supabase
          .schema("hrms")
          .from("leave_requests")
          .select("total_days, duration_breakdown")
          .eq("employee_id", employeeId)
          .eq("leave_type_id", row.leave_type_id)
          .eq("leave_status", "approved")
          .lte("start_date", `${prevYear}-12-31`)
          .gte("end_date", `${prevYear}-01-01`)
          .is("deleted_at", null),
      ]);
      if (previous) {
        previousYearLedgerBalance = Math.max(0, Number(previous.balance_days) || 0);
      }
      previousYearPaidUsedDays = roundLeaveDays(
        (prevRequests ?? []).reduce(
          (sum, req) => sum + paidDaysFromLeaveRequest(req),
          0,
        ),
      );
    }

    const carriedFromPreviousYear = resolveExpectedEarnedLeaveCarryForward({
      joiningDate,
      balanceYear,
      daysPerYear: daysPerYear || 12,
      previousYearLedgerBalance,
      previousYearPaidUsedDays,
    });

    const expectedAllocated = resolveExpectedMonthlyAccrualAllocatedDays({
      leaveTypeCode: code,
      joiningDate,
      balanceYear,
      asOfDate: asOf,
      daysPerYear: daysPerYear || 12,
      carriedFromPreviousYear: code === "EL" ? carriedFromPreviousYear : 0,
    });

    // Never shrink allocation below days already consumed (ledger check constraint).
    const allocated = roundLeaveDays(Math.max(expectedAllocated, used + pending));
    const balanceDays = roundLeaveDays(Math.max(0, allocated - used - pending));
    const accruedThrough = row.accrued_through_month
      ? String(row.accrued_through_month).slice(0, 10)
      : null;

    const same =
      roundLeaveDays(Number(row.allocated_days)) === allocated &&
      roundLeaveDays(Number(row.balance_days)) === balanceDays &&
      accruedThrough === currentMonthStart;
    if (same) continue;

    const { error: updateError } = await supabase
      .schema("hrms")
      .from("leave_balances")
      .update({
        allocated_days: allocated,
        balance_days: balanceDays,
        accrued_through_month: currentMonthStart,
        updated_at: now,
        ...(options?.actorUserId ? { updated_by: options.actorUserId } : {}),
      })
      .eq("id", row.id)
      .is("deleted_at", null);

    if (updateError) {
      console.error("[leave] monthly accrual reconcile failed", updateError.message);
    }
  }
}

/**
 * Opening allocated days when creating a new CL/EL row for a year.
 * EL carries forward previous year remaining balance; CL does not (expires 31 Dec).
 * Adds monthly credits earned in the new year through the as-of month.
 */
export async function resolveMonthlyAccrualOpeningAllocation(
  supabase: AuthSupabaseClient,
  employeeId: string,
  leaveTypeId: string,
  balanceYear: number,
  asOfDate = getTodayDateString(),
  options?: {
    leaveTypeCode?: string;
    daysPerYear?: number;
    joiningDate?: string | null;
  },
): Promise<{ allocatedDays: number; accruedThroughMonth: string }> {
  const currentMonthStart = monthStartDate(asOfDate);
  const code = String(options?.leaveTypeCode ?? "").toUpperCase();
  const daysPerYear = options?.daysPerYear ?? 12;

  let joiningDate = options?.joiningDate ?? null;
  if (joiningDate == null) {
    const { data: employeeRow } = await supabase
      .schema("hrms")
      .from("employees")
      .select("date_of_joining")
      .eq("id", employeeId)
      .is("deleted_at", null)
      .maybeSingle();
    joiningDate = (employeeRow?.date_of_joining as string | null) ?? null;
  }

  let carried = 0;
  if (code === "EL" && balanceYear > 2000) {
    const prevYear = balanceYear - 1;
    const [{ data: previous }, { data: prevRequests }] = await Promise.all([
      supabase
        .schema("hrms")
        .from("leave_balances")
        .select("balance_days")
        .eq("employee_id", employeeId)
        .eq("leave_type_id", leaveTypeId)
        .eq("balance_year", prevYear)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .schema("hrms")
        .from("leave_requests")
        .select("total_days, duration_breakdown")
        .eq("employee_id", employeeId)
        .eq("leave_type_id", leaveTypeId)
        .eq("leave_status", "approved")
        .lte("start_date", `${prevYear}-12-31`)
        .gte("end_date", `${prevYear}-01-01`)
        .is("deleted_at", null),
    ]);

    carried = resolveExpectedEarnedLeaveCarryForward({
      joiningDate,
      balanceYear,
      daysPerYear,
      previousYearLedgerBalance: previous
        ? Math.max(0, Number(previous.balance_days) || 0)
        : null,
      previousYearPaidUsedDays: roundLeaveDays(
        (prevRequests ?? []).reduce(
          (sum, req) => sum + paidDaysFromLeaveRequest(req),
          0,
        ),
      ),
    });
  }

  const allocatedDays = resolveExpectedMonthlyAccrualAllocatedDays({
    leaveTypeCode: code || "CL",
    joiningDate,
    balanceYear,
    asOfDate,
    daysPerYear,
    carriedFromPreviousYear: carried,
  });

  return { allocatedDays, accruedThroughMonth: currentMonthStart };
}
