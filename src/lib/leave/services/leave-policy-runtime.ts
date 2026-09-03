import { cache } from "react";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  parseLeavePolicies,
  parseWorkingConfiguration,
} from "@/lib/company-settings/services/company-settings-parsers";
import {
  calculateLeaveDuration,
  calendarWithEmployeeNonWorkingDates,
  DEFAULT_LEAVE_CALENDAR,
  type LeaveCalendarContext,
  type LeaveWeekendRule,
} from "@/lib/leave/services/leave-calendar-engine";
import {
  CASUAL_LEAVE_CODE,
  DEFAULT_LEAVE_NOTICE,
  DEFAULT_LEAVE_PROBATION_RULES,
  getProbationSnapshot,
  isBlockingLeaveIssue,
  PERIOD_LEAVE_CODE,
  splitLeaveDaysByBalance,
  validateLeavePolicy,
  type LeaveEmployeePolicyState,
  type LeavePolicyNoticeHours,
  type LeaveProbationRules,
} from "@/lib/leave/services/leave-policy-engine";
import { isPendingHrReview, parseHrReviewMetadata } from "@/lib/leave/hr-review";
import {
  isLeaveTypeAllowedForBand,
  isOptionalHolidayAllowedForBand,
  LEAVE_TYPE_NOT_ELIGIBLE_MESSAGE,
  resolveLeaveEligibilityBand,
} from "@/lib/leave/leave-eligibility";
import { ALLOWED_LEAVE_TYPE_CODES, sortByLeaveTypeCode } from "@/lib/leave/constants";
import {
  ensureEmployeeMonthlyLeaveAccruals,
  isMonthlyAccrualLeaveCode,
  MONTHLY_ACCRUAL_DAYS_PER_MONTH,
} from "@/lib/leave/services/leave-monthly-accrual";
import { reconcileEmployeePaidLeaveLedger } from "@/lib/leave/services/leave-ledger-reconcile";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  OPTIONAL_HOLIDAY_CODE,
  OPTIONAL_HOLIDAY_YEARLY_LIMIT,
  remainingOptionalHolidayEntitlement,
  upcomingOptionalHolidays,
} from "@/lib/leave/optional-holiday";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";

export type LeaveTypePolicyRow = {
  id: string;
  code: string;
  name: string;
  isPaid: boolean;
  isCarryForward: boolean;
  daysPerYear: number;
};

export type LeavePolicyRuntime = {
  calendar: LeaveCalendarContext;
  notice: LeavePolicyNoticeHours;
  probation: LeaveProbationRules;
  allowHalfDay: boolean;
  maxConsecutiveDays: number;
  approvalLevels: number;
  leaveTypes: LeaveTypePolicyRow[];
};

function asWeekendRule(value: unknown, fallback: LeaveWeekendRule): LeaveWeekendRule {
  if (value === "off" || value === "working" || value === "half_day" || value === "nth_half") {
    return value;
  }
  return fallback;
}

export function calendarContextFromSettings(
  settings: Record<string, unknown> | null | undefined,
  holidays: string[],
): LeaveCalendarContext {
  const working = parseWorkingConfiguration(settings);
  const leave = parseLeavePolicies(settings);
  const weekendRules = (settings?.weekend_rules as Record<string, unknown> | undefined) ?? {};
  const weeks = Array.isArray(weekendRules.saturday_half_day_weeks)
    ? weekendRules.saturday_half_day_weeks.filter(
        (item): item is number => typeof item === "number" && item >= 1 && item <= 5,
      )
    : working.weekendRules.saturdayHalfDayWeeks;

  return {
    holidays,
    weekendRules: {
      saturday: asWeekendRule(
        working.weekendRules.saturday,
        DEFAULT_LEAVE_CALENDAR.weekendRules.saturday,
      ),
      sunday: asWeekendRule(
        working.weekendRules.sunday,
        DEFAULT_LEAVE_CALENDAR.weekendRules.sunday,
      ),
      saturdayHalfDayWeeks:
        weeks.length > 0 ? weeks : DEFAULT_LEAVE_CALENDAR.weekendRules.saturdayHalfDayWeeks,
    },
    sandwich: leave.sandwichLeave,
  };
}

export const loadLeavePolicyRuntime = cache(async function loadLeavePolicyRuntime(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<LeavePolicyRuntime> {
  const year = new Date().getFullYear();
  const [settingsResult, holidaysResult, typesResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("organization_settings")
      .select("settings, work_week_start_day, timezone")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("holidays")
      .select("holiday_date, is_optional")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .gte("holiday_date", `${year - 1}-01-01`)
      .lte("holiday_date", `${year + 1}-12-31`),
    supabase
      .schema("hrms")
      .from("leave_types")
      .select("id, code, name, is_paid, is_carry_forward, days_per_year, deleted_at")
      .eq("organization_id", organizationId)
      .in("code", [...ALLOWED_LEAVE_TYPE_CODES]),
  ]);

  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (holidaysResult.error) throw new Error(holidaysResult.error.message);
  if (typesResult.error) throw new Error(typesResult.error.message);

  const settings = (settingsResult.data?.settings as Record<string, unknown> | null) ?? null;
  const holidays = (holidaysResult.data ?? [])
    .filter((row) => !row.is_optional)
    .map((row) => row.holiday_date);
  const working = parseWorkingConfiguration(settings, {
    workWeekStartDay: settingsResult.data?.work_week_start_day,
    timezone: settingsResult.data?.timezone,
  });
  const leave = parseLeavePolicies(settings);
  const leavePolicies = (settings?.leave_policies as Record<string, unknown> | undefined) ?? {};
  const probationRaw = (leavePolicies.probation as Record<string, unknown> | undefined) ?? {};

  const probation: LeaveProbationRules = {
    durationMonths:
      Number(probationRaw.duration_months) || DEFAULT_LEAVE_PROBATION_RULES.durationMonths,
    firstMonthLeaveAllowed:
      typeof probationRaw.first_month_leave_allowed === "boolean"
        ? probationRaw.first_month_leave_allowed
        : DEFAULT_LEAVE_PROBATION_RULES.firstMonthLeaveAllowed,
    casualLeaveCap:
      Number(probationRaw.casual_leave_cap) || DEFAULT_LEAVE_PROBATION_RULES.casualLeaveCap,
    periodLeaveCap:
      Number(probationRaw.period_leave_cap) || DEFAULT_LEAVE_PROBATION_RULES.periodLeaveCap,
    periodLeaveFemaleOnly:
      typeof probationRaw.period_leave_female_only === "boolean"
        ? probationRaw.period_leave_female_only
        : DEFAULT_LEAVE_PROBATION_RULES.periodLeaveFemaleOnly,
    carryForwardAllowed:
      typeof probationRaw.carry_forward_allowed === "boolean"
        ? probationRaw.carry_forward_allowed
        : DEFAULT_LEAVE_PROBATION_RULES.carryForwardAllowed,
  };

  const leaveTypesByCode = new Map<string, LeaveTypePolicyRow>();
  for (const row of typesResult.data ?? []) {
    const isLive = row.deleted_at == null;
    const current = leaveTypesByCode.get(row.code);
    if (!current || isLive) {
      leaveTypesByCode.set(row.code, {
        id: row.id,
        code: row.code,
        name: row.name,
        isPaid: Boolean(row.is_paid),
        isCarryForward: Boolean(row.is_carry_forward),
        daysPerYear: Number(row.days_per_year ?? 0),
      });
    }
  }

  return {
    calendar: calendarContextFromSettings(settings, holidays),
    notice: {
      advanceNoticeHours: Math.max(leave.minNoticeDays, 1) * 24,
      officeStart: working.officeHours.start,
      officeEnd: working.officeHours.end,
    },
    probation,
    allowHalfDay: leave.allowHalfDay,
    maxConsecutiveDays: leave.maxConsecutiveDays,
    approvalLevels: leave.approvalLevels,
    leaveTypes: sortByLeaveTypeCode([...leaveTypesByCode.values()]),
  };
});

function unwrapEmploymentType(
  value:
    | { code?: string | null; is_full_time?: boolean | null }
    | { code?: string | null; is_full_time?: boolean | null }[]
    | null
    | undefined,
): { code: string | null; isFullTime: boolean | null } | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  if (!row) return null;
  return {
    code: row.code ?? null,
    isFullTime: typeof row.is_full_time === "boolean" ? row.is_full_time : null,
  };
}

export async function loadLeaveEmployeePolicyState(
  supabase: AuthSupabaseClient,
  employeeId: string,
  balanceYear = getCurrentBalanceYear(),
  organizationId?: string,
): Promise<LeaveEmployeePolicyState> {
  const [employeeResult, profileResult, balancesResult] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, date_of_joining, employment_status, organization_id, employment_types:employment_type_id (code, is_full_time)")
      .eq("id", employeeId)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("employee_profiles")
      .select("gender")
      .eq("employee_id", employeeId)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("leave_balances")
      .select("used_days, pending_days, leave_types:leave_type_id (code)")
      .eq("employee_id", employeeId)
      .eq("balance_year", balanceYear)
      .is("deleted_at", null),
  ]);

  if (employeeResult.error) throw new Error(employeeResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (balancesResult.error) throw new Error(balancesResult.error.message);
  if (!employeeResult.data) throw new Error("Employee not found");
  if (organizationId && employeeResult.data.organization_id !== organizationId) {
    throw new Error("Employee not found");
  }

  const usedAndPendingByType: Record<string, number> = {};
  for (const row of balancesResult.data ?? []) {
    const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
    const code = String(leaveType?.code ?? "");
    if (!code) continue;
    usedAndPendingByType[code] =
      Number(row.used_days) + Number(row.pending_days);
  }

  const codesFromBalances = new Set(Object.keys(usedAndPendingByType));
  const { data: requestRows, error: requestError } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("total_days, leave_status, duration_breakdown, leave_types:leave_type_id (code)")
    .eq("employee_id", employeeId)
    .in("leave_status", ["pending", "approved"])
    .is("deleted_at", null);
  if (requestError) throw new Error(requestError.message);
  for (const row of requestRows ?? []) {
    if (isPendingHrReview(row.leave_status, row.duration_breakdown)) continue;
    const review = parseHrReviewMetadata(row.duration_breakdown);
    if (row.leave_status === "approved" && review?.decision === "special") continue;
    if (row.leave_status === "approved" && review?.decision === "lop") continue;
    const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
    const code = String(leaveType?.code ?? "");
    if (!code || codesFromBalances.has(code)) continue;
    usedAndPendingByType[code] =
      (usedAndPendingByType[code] ?? 0) + Number(row.total_days);
  }

  const employmentType = unwrapEmploymentType(employeeResult.data.employment_types);
  const leaveEligibilityBand = resolveLeaveEligibilityBand({
    employmentStatus: employeeResult.data.employment_status,
    employmentTypeCode: employmentType?.code ?? null,
    isFullTime: employmentType?.isFullTime ?? null,
  });

  return {
    employeeId,
    joiningDate: employeeResult.data.date_of_joining,
    employmentStatus: employeeResult.data.employment_status,
    gender: profileResult.data?.gender ?? null,
    usedAndPendingByType,
    employmentTypeCode: employmentType?.code ?? null,
    isFullTime: employmentType?.isFullTime ?? true,
    leaveEligibilityBand,
  };
}

export async function hasOverlappingLeave(
  supabase: AuthSupabaseClient,
  employeeId: string,
  startDate: string,
  endDate: string,
  excludeRequestId?: string,
): Promise<boolean> {
  let query = supabase
    .schema("hrms")
    .from("leave_requests")
    .select("id")
    .eq("employee_id", employeeId)
    .in("leave_status", ["pending", "approved"])
    .is("deleted_at", null)
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);

  if (excludeRequestId) {
    query = query.neq("id", excludeRequestId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function pendingCreditForRequest(
  supabase: AuthSupabaseClient,
  requestId: string,
): Promise<{ code: string; days: number } | undefined> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("total_days, leave_types:leave_type_id (code)")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  const leaveType = Array.isArray(data.leave_types) ? data.leave_types[0] : data.leave_types;
  const code = String(leaveType?.code ?? "");
  if (!code) return undefined;
  return { code, days: Number(data.total_days) };
}

async function loadApprovedOptionalHolidayDates(
  supabase: AuthSupabaseClient,
  employeeId: string,
  year: number,
  excludeRequestId?: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("id, start_date, leave_types:leave_type_id (code)")
    .eq("employee_id", employeeId)
    .eq("leave_status", "approved")
    .gte("start_date", `${year}-01-01`)
    .lte("start_date", `${year}-12-31`)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);

  const dates: string[] = [];
  for (const row of data ?? []) {
    if (excludeRequestId && row.id === excludeRequestId) continue;
    const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
    if (String(leaveType?.code ?? "").toUpperCase() !== OPTIONAL_HOLIDAY_CODE) continue;
    dates.push(String(row.start_date).slice(0, 10));
  }
  return dates;
}

export async function evaluateLeaveApplication(
  supabase: AuthSupabaseClient,
  organizationId: string,
  input: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    isHalfDay: boolean;
    halfDayPeriod?: "morning" | "afternoon" | "" | null;
    excludeRequestId?: string;
    pendingCredit?: { code: string; days: number };
    skipNotice?: boolean;
    enforceSelfServiceLimits?: boolean;
  },
) {
  const credit =
    input.pendingCredit ??
    (input.excludeRequestId
      ? await pendingCreditForRequest(supabase, input.excludeRequestId)
      : undefined);

  await ensureEmployeeMonthlyLeaveAccruals(supabase, input.employeeId, {
    balanceYear: getCurrentBalanceYear(input.startDate),
    asOfDate: input.startDate,
  });
  await reconcileEmployeePaidLeaveLedger(supabase, input.employeeId, {
    balanceYear: getCurrentBalanceYear(input.startDate),
  });

  const [runtime, employee, overlapping] = await Promise.all([
    loadLeavePolicyRuntime(supabase, organizationId),
    loadLeaveEmployeePolicyState(supabase, input.employeeId, getCurrentBalanceYear(input.startDate), organizationId),
    hasOverlappingLeave(
      supabase,
      input.employeeId,
      input.startDate,
      input.endDate,
      input.excludeRequestId,
    ),
  ]);

  if (credit) {
    const current = employee.usedAndPendingByType[credit.code] ?? 0;
    employee.usedAndPendingByType[credit.code] = Math.max(0, current - credit.days);
  }

  const leaveType = runtime.leaveTypes.find((item) => item.id === input.leaveTypeId);
  if (!leaveType) {
    throw new Error("Select a valid leave type");
  }

  const band = employee.leaveEligibilityBand ?? "full_time_confirmed";
  if (!isLeaveTypeAllowedForBand(leaveType.code, band)) {
    throw new Error(LEAVE_TYPE_NOT_ELIGIBLE_MESSAGE);
  }

  const durationCalendar = calendarWithEmployeeNonWorkingDates(
    runtime.calendar,
    await loadApprovedOptionalHolidayDates(
      supabase,
      input.employeeId,
      getCurrentBalanceYear(input.startDate),
      input.excludeRequestId,
    ),
  );

  const duration = calculateLeaveDuration({
    startDate: input.startDate,
    endDate: input.endDate,
    isHalfDay: input.isHalfDay,
    calendar: durationCalendar,
  });

  const { data: balance } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .select("balance_days")
    .eq("employee_id", input.employeeId)
    .eq("leave_type_id", input.leaveTypeId)
    .eq("balance_year", getCurrentBalanceYear(input.startDate))
    .is("deleted_at", null)
    .maybeSingle();

  const probation = getProbationSnapshot(
    employee,
    input.startDate,
    runtime.probation,
  );
  const code = leaveType.code.toUpperCase();
  // Ledger may be missing for a brand-new type. Monthly CL/EL start at 1 for the
  // current month; other paid types fall back to configured days_per_year.
  const fallbackAvailable = isMonthlyAccrualLeaveCode(code)
    ? MONTHLY_ACCRUAL_DAYS_PER_MONTH
    : Number(leaveType.daysPerYear ?? 0);
  let availableBalance = leaveType.isPaid
    ? Number(balance?.balance_days ?? fallbackAvailable)
    : null;
  if (availableBalance != null) {
    availableBalance = Math.max(0, availableBalance);
  }
  if (probation.onProbation && code === CASUAL_LEAVE_CODE && availableBalance != null) {
    const probationRemaining = Math.max(
      0,
      runtime.probation.casualLeaveCap - (employee.usedAndPendingByType[CASUAL_LEAVE_CODE] ?? 0),
    );
    availableBalance = Math.min(availableBalance, probationRemaining);
  }
  if (probation.onProbation && code === PERIOD_LEAVE_CODE && availableBalance != null) {
    const probationRemaining = Math.max(
      0,
      runtime.probation.periodLeaveCap - (employee.usedAndPendingByType[PERIOD_LEAVE_CODE] ?? 0),
    );
    availableBalance = Math.min(availableBalance, probationRemaining);
  }

  if (code === OPTIONAL_HOLIDAY_CODE) {
    if (!isOptionalHolidayAllowedForBand(band)) {
      throw new Error(LEAVE_TYPE_NOT_ELIGIBLE_MESSAGE);
    }
    if (input.isHalfDay) {
      throw new Error("Optional Holiday is a full day. Choose a date from the Optional Holiday list.");
    }
    if (input.startDate !== input.endDate) {
      throw new Error("Select one Optional Holiday date.");
    }
    const today = getTodayDateString();
    if (input.startDate < today) {
      throw new Error("This Optional Holiday date has already passed.");
    }
    const year = getCurrentBalanceYear(input.startDate);
    const { data: holidayRows, error: holidayError } = await supabase
      .schema("hrms")
      .from("holidays")
      .select("holiday_date")
      .eq("organization_id", organizationId)
      .eq("is_optional", true)
      .eq("status", "active")
      .gte("holiday_date", `${year}-01-01`)
      .lte("holiday_date", `${year}-12-31`)
      .is("deleted_at", null);
    if (holidayError) throw new Error(holidayError.message);
    const configured = (holidayRows ?? []).map((row) => String(row.holiday_date).slice(0, 10));
    if (!configured.includes(input.startDate)) {
      throw new Error("This date is not on the company's Optional Holiday list.");
    }
    const { data: ohRequests, error: ohError } = await supabase
      .schema("hrms")
      .from("leave_requests")
      .select("id, start_date, leave_types:leave_type_id (code)")
      .eq("employee_id", input.employeeId)
      .in("leave_status", ["pending", "approved"])
      .is("deleted_at", null);
    if (ohError) throw new Error(ohError.message);
    const takenDates = new Set<string>();
    for (const row of ohRequests ?? []) {
      if (input.excludeRequestId && row.id === input.excludeRequestId) continue;
      const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
      if (String(leaveType?.code ?? "").toUpperCase() !== OPTIONAL_HOLIDAY_CODE) continue;
      const date = String(row.start_date).slice(0, 10);
      if (date.slice(0, 4) !== String(year)) continue;
      takenDates.add(date);
    }
    if (takenDates.has(input.startDate)) {
      throw new Error("You have already applied for this Optional Holiday.");
    }
    const yearlyLimit = Math.max(Number(leaveType.daysPerYear ?? 0), OPTIONAL_HOLIDAY_YEARLY_LIMIT);
    const upcomingAvailable = upcomingOptionalHolidays(
      configured.map((date) => ({ id: date, name: date, date })),
      today,
    ).filter((holiday) => !takenDates.has(holiday.date)).length;
    availableBalance = remainingOptionalHolidayEntitlement({
      yearlyLimit,
      usedOrPending: takenDates.size,
      upcomingAvailableDates: upcomingAvailable,
    });
    if (availableBalance < 1) {
      throw new Error("You have used your Optional Holiday entitlement for this year.");
    }
    if (duration.totalLeaveDays <= 0) {
      throw new Error("This Optional Holiday falls on a weekly holiday, so it cannot be applied.");
    }
  }

  const issues = validateLeavePolicy({
    startDate: input.startDate,
    endDate: input.endDate,
    isHalfDay: input.isHalfDay,
    halfDayPeriod: input.halfDayPeriod,
    leaveTypeCode: leaveType.code,
    isPaid: leaveType.isPaid,
    duration,
    availableBalance,
    employee,
    probation: runtime.probation,
    notice: runtime.notice,
    allowHalfDay: runtime.allowHalfDay,
    maxConsecutiveDays: runtime.maxConsecutiveDays,
    overlapping,
    skipNotice: input.skipNotice || code === OPTIONAL_HOLIDAY_CODE,
    enforceSelfServiceLimits: input.enforceSelfServiceLimits === true,
  });

  const blockingIssues = issues.filter(isBlockingLeaveIssue);
  if (blockingIssues.length > 0) {
    throw new Error(blockingIssues[0].message);
  }

  const split =
    code === OPTIONAL_HOLIDAY_CODE
      ? { paidDays: duration.totalLeaveDays, lopDays: 0 }
      : splitLeaveDaysByBalance({
          totalDays: duration.totalLeaveDays,
          availableBalance,
          isPaid: leaveType.isPaid,
        });

  return {
    runtime: { ...runtime, calendar: durationCalendar },
    employee,
    leaveType,
    duration,
    availableBalance,
    probation,
    split,
    issues,
  };
}

export { PERIOD_LEAVE_CODE, DEFAULT_LEAVE_NOTICE };

