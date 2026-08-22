import type { LeaveEmployeeBalanceSnapshot } from "@/types/leave";
import { formatLeaveDayCount, roundLeaveDays } from "@/lib/leave/services/leave-usage";

/** Shared caption for used / entitlement displays across leave surfaces. */
export const LEAVE_BALANCE_USAGE_CAPTION = "Used this year / annual entitlement";

/** Calendar-counted days taken this balance year (approved + pending). */
export function getLeaveBalanceYearUsage(
  row: LeaveEmployeeBalanceSnapshot,
): number {
  return (
    row.yearTakenDays ??
    roundLeaveDays((row.usedDays ?? 0) + (row.pendingDays ?? 0))
  );
}

export function getLeaveBalanceAnnualEntitlement(
  row: LeaveEmployeeBalanceSnapshot,
): number {
  return row.allocatedDays ?? row.monthTotalDays ?? 0;
}

/** Standard `used / entitlement` label used on dashboard cards and apply-leave balance chips. */
export function formatLeaveBalanceUsedTotal(row: LeaveEmployeeBalanceSnapshot): string {
  return `${formatLeaveDayCount(getLeaveBalanceYearUsage(row))} / ${formatLeaveDayCount(getLeaveBalanceAnnualEntitlement(row))}`;
}
