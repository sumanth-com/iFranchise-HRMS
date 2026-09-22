import type { LeaveEmployeeBalanceSnapshot } from "@/types/leave";
import { formatLeaveDayCount, roundLeaveDays } from "@/lib/leave/services/leave-usage";

/** Shared caption for used / entitlement displays across leave surfaces that still use annual pools. */
export const LEAVE_BALANCE_USAGE_CAPTION = "Used this year / annual entitlement";

/** Caption for monthly-accrual available-balance cards (CL / EL). */
export const LEAVE_BALANCE_AVAILABLE_CAPTION = "Available balance";

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

/** Currently available days (allocated − used − pending). */
export function getLeaveBalanceAvailableDays(
  row: LeaveEmployeeBalanceSnapshot,
): number {
  return roundLeaveDays(row.balanceDays ?? 0);
}

export function getLeaveBalanceCarriedForwardDays(
  row: LeaveEmployeeBalanceSnapshot,
): number {
  return roundLeaveDays(Math.max(0, Number(row.carriedForwardDays ?? 0)));
}

export function formatLeaveBalanceAvailable(row: LeaveEmployeeBalanceSnapshot): string {
  return formatLeaveDayCount(Math.max(0, getLeaveBalanceAvailableDays(row)));
}

/** Caption under CL/EL/OH cards — includes EL carry-forward when present. */
export function formatLeaveBalanceCardCaption(row: LeaveEmployeeBalanceSnapshot): string {
  const code = String(row.leaveTypeCode ?? "").toUpperCase();
  if (code === "OH") return "Available this year";
  const carry = getLeaveBalanceCarriedForwardDays(row);
  if (code === "EL" && carry > 0) {
    return `${LEAVE_BALANCE_AVAILABLE_CAPTION} · includes ${formatLeaveDayCount(carry)} carried forward`;
  }
  return LEAVE_BALANCE_AVAILABLE_CAPTION;
}

/** Standard `used / entitlement` label used on surfaces that still show annual pools. */
export function formatLeaveBalanceUsedTotal(row: LeaveEmployeeBalanceSnapshot): string {
  return `${formatLeaveDayCount(getLeaveBalanceYearUsage(row))} / ${formatLeaveDayCount(getLeaveBalanceAnnualEntitlement(row))}`;
}
