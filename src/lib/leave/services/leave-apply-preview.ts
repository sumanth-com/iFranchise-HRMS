import { isOptionalHolidayCode } from "@/lib/leave/optional-holiday";
import { calculateLeaveDuration } from "@/lib/leave/services/leave-calendar-engine";
import {
  buildLeavePreviewMessages,
  CASUAL_LEAVE_CODE,
  isBlockingLeaveIssue,
  PERIOD_LEAVE_CODE,
  splitLeaveDaysByBalance,
  validateLeavePolicy,
  type LeaveDaySplit,
  type LeavePolicyIssue,
} from "@/lib/leave/services/leave-policy-engine";
import type { LeaveApplyContext } from "@/types/leave";
import type { LeaveDurationBreakdown } from "@/lib/leave/services/leave-calendar-engine";

export type LeaveApplyPreview = {
  duration: LeaveDurationBreakdown;
  available: number | null;
  remaining: number | null;
  issues: LeavePolicyIssue[];
  blockingIssues: LeavePolicyIssue[];
  split: LeaveDaySplit;
  messages: string[];
  leaveType: LeaveApplyContext["leaveTypes"][number];
};

export function previewLeaveApplication(input: {
  context: LeaveApplyContext;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
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
  const remaining =
    available == null ? null : Number((available - duration.totalLeaveDays).toFixed(2));

  const issues = validateLeavePolicy({
    startDate: input.startDate,
    endDate: input.endDate,
    isHalfDay: input.isHalfDay,
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
  });

  const messages = buildLeavePreviewMessages({
    duration,
    availableBalance: available,
    remainingBalance: remaining,
    leaveTypeCode: leaveType.code,
    probation: input.context.probation,
    requiresManagerAndHr: input.context.approvalLevels >= 2,
  });

  const split = isOptionalHolidayCode(leaveType.code)
    ? { paidDays: duration.totalLeaveDays, lopDays: 0 }
    : splitLeaveDaysByBalance({
        totalDays: duration.totalLeaveDays,
        availableBalance: available,
        isPaid: leaveType.isPaid,
      });

  return {
    duration,
    available,
    remaining,
    issues,
    blockingIssues: issues.filter(isBlockingLeaveIssue),
    split,
    messages,
    leaveType,
  };
}
