import { isOptionalHolidayCode } from "@/lib/leave/optional-holiday";
import { calculateLeaveDuration } from "@/lib/leave/services/leave-calendar-engine";
import {
  allocateLeaveDaysByBalance,
  buildLeavePreviewMessages,
  CASUAL_LEAVE_CODE,
  isBlockingLeaveIssue,
  PERIOD_LEAVE_CODE,
  splitLeaveDaysByBalance,
  splitLeaveDaysFromAllocations,
  validateLeavePolicy,
  type LeaveDayAllocation,
  type LeaveDaySplit,
  type LeavePolicyIssue,
} from "@/lib/leave/services/leave-policy-engine";
import type { LeaveApplyContext } from "@/types/leave";
import type { LeaveCalendarContext, LeaveDurationBreakdown } from "@/lib/leave/services/leave-calendar-engine";
import { roundLeaveDays } from "@/lib/leave/services/leave-usage";

export type LeaveApplySummary = {
  requestedLeaveDays: number;
  sandwichLeaveDays: number;
  totalLeaveDaysCounted: number;
  paidLeaveDays: number;
  remainingBalance: number | null;
  lopDays: number;
  dayAllocations: LeaveDayAllocation[];
};

export type LeaveApplyPreview = {
  duration: LeaveDurationBreakdown;
  summary: LeaveApplySummary;
  available: number | null;
  remaining: number | null;
  issues: LeavePolicyIssue[];
  blockingIssues: LeavePolicyIssue[];
  split: LeaveDaySplit;
  messages: string[];
  leaveType: LeaveApplyContext["leaveTypes"][number];
};

export function buildLeaveApplySummary(input: {
  duration: LeaveDurationBreakdown;
  split: LeaveDaySplit;
  availableBalance: number | null;
  calendar?: LeaveCalendarContext;
  isPaidLeaveType?: boolean;
}): LeaveApplySummary {
  const requestedLeaveDays = roundLeaveDays(
    input.duration.days
      .filter(
        (day) =>
          day.inRequestedRange &&
          (day.kind === "working" || day.kind === "half_day"),
      )
      .reduce((sum, day) => sum + day.counted, 0),
  );
  const sandwichLeaveDays = roundLeaveDays(input.duration.sandwichDays);
  const totalLeaveDaysCounted = roundLeaveDays(input.duration.totalLeaveDays);
  const paidQuota =
    input.isPaidLeaveType === false || input.availableBalance == null
      ? input.duration.totalLeaveDays
      : roundLeaveDays(
          Math.min(input.duration.totalLeaveDays, Math.max(0, input.availableBalance)),
        );
  const dayAllocations = allocateLeaveDaysByBalance(input.duration, paidQuota, {
    isPaidLeaveType: input.isPaidLeaveType !== false,
    calendar: input.calendar,
  });
  const split = splitLeaveDaysFromAllocations(dayAllocations, input.isPaidLeaveType !== false);
  const remainingBalance =
    input.availableBalance == null
      ? null
      : roundLeaveDays(Math.max(0, input.availableBalance - split.paidDays));

  return {
    requestedLeaveDays,
    sandwichLeaveDays,
    totalLeaveDaysCounted,
    paidLeaveDays: split.paidDays,
    remainingBalance,
    lopDays: split.lopDays,
    dayAllocations,
  };
}

export function previewLeaveApplication(input: {
  context: LeaveApplyContext;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayPeriod?: "morning" | "afternoon" | "" | null;
  enforceSelfServiceLimits?: boolean;
}): LeaveApplyPreview | null {
  const leaveType = input.context.leaveTypes.find((item) => item.id === input.leaveTypeId);
  if (!leaveType || !input.startDate || !input.endDate || input.endDate < input.startDate) {
    return null;
  }

  const duration = calculateLeaveDuration({
    startDate: input.startDate,
    endDate: input.endDate,
    isHalfDay: input.isHalfDay,
    calendar: input.context.calendar,
  });

  const balance = input.context.balances.find(
    (item) => item.leaveTypeCode === leaveType.code,
  );
  const probationCaps = input.context.probationRules;
  const ledgerAvailable = balance?.balanceDays ?? (leaveType.isPaid ? 0 : null);
  const available =
    leaveType.code === CASUAL_LEAVE_CODE &&
    input.context.probation.onProbation &&
    ledgerAvailable != null
      ? Math.min(
          Math.max(0, ledgerAvailable),
          Math.max(
            0,
            probationCaps.casualLeaveCap -
              (input.context.employee.usedAndPendingByType[CASUAL_LEAVE_CODE] ?? 0),
          ),
        )
      : leaveType.code === PERIOD_LEAVE_CODE &&
          input.context.probation.onProbation &&
          ledgerAvailable != null
        ? Math.min(
            Math.max(0, ledgerAvailable),
            Math.max(
              0,
              probationCaps.periodLeaveCap -
                (input.context.employee.usedAndPendingByType[PERIOD_LEAVE_CODE] ?? 0),
            ),
          )
        : ledgerAvailable;
  const provisionalSplit = isOptionalHolidayCode(leaveType.code)
    ? { paidDays: duration.totalLeaveDays, lopDays: 0 }
    : splitLeaveDaysByBalance({
        totalDays: duration.totalLeaveDays,
        availableBalance: available,
        isPaid: leaveType.isPaid,
      });
  const summary = buildLeaveApplySummary({
    duration,
    split: provisionalSplit,
    availableBalance: available,
    calendar: input.context.calendar,
    isPaidLeaveType: leaveType.isPaid,
  });
  const split = {
    paidDays: summary.paidLeaveDays,
    lopDays: summary.lopDays,
  };

  const issues = validateLeavePolicy({
    startDate: input.startDate,
    endDate: input.endDate,
    isHalfDay: input.isHalfDay,
    halfDayPeriod: input.halfDayPeriod,
    leaveTypeCode: leaveType.code,
    isPaid: leaveType.isPaid,
    duration,
    availableBalance: available,
    employee: input.context.employee,
    probation: probationCaps,
    notice: input.context.notice,
    allowHalfDay: input.context.allowHalfDay,
    maxConsecutiveDays: input.context.maxConsecutiveDays,
    overlapping: false,
    enforceSelfServiceLimits: input.enforceSelfServiceLimits === true,
  });

  const messages = buildLeavePreviewMessages({
    duration,
    availableBalance: available,
    remainingBalance: summary.remainingBalance,
    leaveTypeCode: leaveType.code,
    probation: input.context.probation,
    requiresManagerAndHr: input.context.approvalLevels >= 2,
  });

  return {
    duration,
    summary,
    available,
    remaining: summary.remainingBalance,
    issues,
    blockingIssues: issues.filter(isBlockingLeaveIssue),
    split,
    messages,
    leaveType,
  };
}
