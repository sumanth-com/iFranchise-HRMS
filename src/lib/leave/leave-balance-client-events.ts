/**
 * Browser-only signal so Leave Balance panels can reload month-scoped data
 * after leave mutations without a full portal remount or polling.
 */
export const LEAVE_BALANCES_CHANGED_EVENT = "hrms:leave-balances:changed";

export type LeaveBalancesChangedDetail = {
  employeeId?: string | null;
  reason?: string;
};

export function notifyLeaveBalancesChanged(
  detail: LeaveBalancesChangedDetail = {},
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LeaveBalancesChangedDetail>(LEAVE_BALANCES_CHANGED_EVENT, {
      detail,
    }),
  );
}
