import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  resolveInternClStoredBalance,
  resolveInternProbationClEntitlement,
} from "@/lib/leave/leave-entitlement";
import type { LeaveEligibilityBand } from "@/lib/leave/leave-eligibility";
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
 * When a prior-year ledger balance exists, that remaining balance carries in full
 * for as long as the employee is employed. It is not capped at one year's credits.
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

  if (
    input.previousYearLedgerBalance != null &&
    Number.isFinite(Number(input.previousYearLedgerBalance))
  ) {
    return roundLeaveDays(Math.max(0, Number(input.previousYearLedgerBalance)));
  }

  const prevYear = input.balanceYear - 1;
  const expectedPrevCredits = resolveExpectedMonthlyAccrualAllocatedDays({
    leaveTypeCode: "EL",
    joiningDate: input.joiningDate,
    balanceYear: prevYear,
    asOfDate: `${prevYear}-12-31`,
    daysPerYear: input.daysPerYear || 12,
    carriedFromPreviousYear: 0,
  });
  const paidUsed = Math.max(0, Number(input.previousYearPaidUsedDays) || 0);
  return roundLeaveDays(Math.max(0, expectedPrevCredits - paidUsed));
}

/** Full-time CL/EL start on the conversion date. Intern/probation CL uses joining date. */
export function resolveLeaveAccrualStartDate(input: {
  joiningDate: string | null | undefined;
  fullTimeEffectiveDate?: string | null;
  leaveEligibilityBand: LeaveEligibilityBand;
}): string | null {
  const joining = input.joiningDate ? input.joiningDate.slice(0, 10) : null;
  if (input.leaveEligibilityBand !== "full_time_confirmed") return joining;
  const effective = input.fullTimeEffectiveDate
    ? input.fullTimeEffectiveDate.slice(0, 10)
    : null;
  return effective || joining;
}

async function loadMonthLeaveUsage(
  supabase: AuthSupabaseClient,
  employeeId: string,
  leaveTypeId: string,
  asOfDate: string,
): Promise<{ used: number; pending: number }> {
  const monthStart = monthStartDate(asOfDate);
  const [year, month] = monthStart.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = `${monthStart.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("leave_status, total_days, duration_breakdown, start_date")
    .eq("employee_id", employeeId)
    .eq("leave_type_id", leaveTypeId)
    .in("leave_status", ["approved", "pending"])
    .gte("start_date", monthStart)
    .lte("start_date", monthEnd)
    .is("deleted_at", null);

  if (error) {
    console.error("[leave] monthly CL usage load failed", error.message);
    return { used: 0, pending: 0 };
  }

  let used = 0;
  let pending = 0;
  for (const request of data ?? []) {
    const paid = paidDaysFromLeaveRequest(request);
    if (request.leave_status === "approved") used += paid;
    else if (request.leave_status === "pending") pending += paid;
  }
  return { used: roundLeaveDays(used), pending: roundLeaveDays(pending) };
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

type EmployeeAccrualProfile = {
  employmentStatus: string;
  joiningDate: string | null;
  fullTimeEffectiveDate: string | null;
  employmentTypeCode: string | null;
  isFullTime: boolean | null;
};

const EMPLOYEE_ACCRUAL_SELECT_WITH_CONVERSION =
  "employment_status, date_of_joining, full_time_effective_date, employment_types:employment_type_id (code, is_full_time)";
const EMPLOYEE_ACCRUAL_SELECT =
  "employment_status, date_of_joining, employment_types:employment_type_id (code, is_full_time)";

async function loadEmployeeAccrualProfile(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<{ profile: EmployeeAccrualProfile | null; error: string | null }> {
  let result = await supabase
    .schema("hrms")
    .from("employees")
    .select(EMPLOYEE_ACCRUAL_SELECT_WITH_CONVERSION)
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error && /full_time_effective_date/.test(result.error.message)) {
    result = await supabase
      .schema("hrms")
      .from("employees")
      .select(EMPLOYEE_ACCRUAL_SELECT)
      .eq("id", employeeId)
      .is("deleted_at", null)
      .maybeSingle();
  }

  if (result.error) {
    return { profile: null, error: result.error.message };
  }

  const row = result.data as
    | {
        employment_status?: string | null;
        date_of_joining?: string | null;
        full_time_effective_date?: string | null;
        employment_types?:
          | { code?: string | null; is_full_time?: boolean | null }
          | { code?: string | null; is_full_time?: boolean | null }[]
          | null;
      }
    | null;
  const typeRaw = row?.employment_types;
  const typeRow = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;

  return {
    profile: {
      employmentStatus: String(row?.employment_status ?? "active"),
      joiningDate: row?.date_of_joining ?? null,
      fullTimeEffectiveDate: row?.full_time_effective_date ?? null,
      employmentTypeCode: typeRow?.code ?? null,
      isFullTime: typeof typeRow?.is_full_time === "boolean" ? typeRow.is_full_time : null,
    },
    error: null,
  };
}

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

  const { profile, error: employeeError } = await loadEmployeeAccrualProfile(supabase, employeeId);
  if (employeeError || !profile) {
    console.error("[leave] monthly accrual employee load failed", employeeError ?? "employee not found");
    return;
  }

  const leaveEligibilityBand = resolveLeaveEligibilityBand({
    employmentStatus: profile.employmentStatus,
    employmentTypeCode: profile.employmentTypeCode,
    isFullTime: profile.isFullTime,
  });
  const joiningDate = profile.joiningDate;
  const accrualStartDate = resolveLeaveAccrualStartDate({
    joiningDate,
    fullTimeEffectiveDate: profile.fullTimeEffectiveDate,
    leaveEligibilityBand,
  });

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
          employmentStatus: profile.employmentStatus,
          leaveEligibilityBand,
          asOfDate: asOf,
        });
        const monthly = entitlement?.monthlyEntitlement ?? 0;
        const monthUsage = await loadMonthLeaveUsage(supabase, employeeId, row.leave_type_id, asOf);
        const stored = resolveInternClStoredBalance({
          monthlyEntitlement: monthly,
          yearUsedDays: used,
          yearPendingDays: pending,
          monthUsedDays: monthUsage.used,
          monthPendingDays: monthUsage.pending,
        });
        const allocated = stored.allocatedDays;
        const balanceDays = stored.balanceDays;
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
      joiningDate: accrualStartDate,
      balanceYear,
      daysPerYear: daysPerYear || 12,
      previousYearLedgerBalance,
      previousYearPaidUsedDays,
    });

    const expectedAllocated = resolveExpectedMonthlyAccrualAllocatedDays({
      leaveTypeCode: code,
      joiningDate: accrualStartDate,
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
    fullTimeEffectiveDate?: string | null;
    leaveEligibilityBand?: LeaveEligibilityBand;
  },
): Promise<{ allocatedDays: number; accruedThroughMonth: string }> {
  const currentMonthStart = monthStartDate(asOfDate);
  const code = String(options?.leaveTypeCode ?? "").toUpperCase();
  const daysPerYear = options?.daysPerYear ?? 12;

  let joiningDate = options?.joiningDate ?? null;
  let fullTimeEffectiveDate = options?.fullTimeEffectiveDate ?? null;
  let leaveEligibilityBand = options?.leaveEligibilityBand ?? "full_time_confirmed";
  if (joiningDate == null || options?.leaveEligibilityBand == null) {
    const { profile, error: employeeError } = await loadEmployeeAccrualProfile(supabase, employeeId);
    if (employeeError || !profile) {
      console.error("[leave] opening allocation employee load failed", employeeError ?? "employee not found");
      return { allocatedDays: 0, accruedThroughMonth: currentMonthStart };
    }
    joiningDate = joiningDate ?? profile.joiningDate;
    fullTimeEffectiveDate = fullTimeEffectiveDate ?? profile.fullTimeEffectiveDate;
    leaveEligibilityBand = resolveLeaveEligibilityBand({
      employmentStatus: profile.employmentStatus,
      employmentTypeCode: profile.employmentTypeCode,
      isFullTime: profile.isFullTime,
    });
  }

  const accrualStartDate = resolveLeaveAccrualStartDate({
    joiningDate,
    fullTimeEffectiveDate,
    leaveEligibilityBand,
  });

  if (leaveEligibilityBand === "cl_only" && code === "CL") {
    const entitlement = resolveInternProbationClEntitlement({
      joiningDate,
      employmentStatus: "active",
      leaveEligibilityBand,
      asOfDate,
    });
    return {
      allocatedDays: entitlement?.monthlyEntitlement ?? 0,
      accruedThroughMonth: currentMonthStart,
    };
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
      joiningDate: accrualStartDate,
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
    joiningDate: accrualStartDate,
    balanceYear,
    asOfDate,
    daysPerYear,
    carriedFromPreviousYear: carried,
  });

  return { allocatedDays, accruedThroughMonth: currentMonthStart };
}
