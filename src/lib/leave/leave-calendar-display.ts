/**
 * Leave calendar pill labels/colors — UI display only.
 * Uses recorded day allocations + leave type code/name; does not change policy.
 */
import { LEAVE_CALENDAR_LEGEND } from "@/lib/leave/constants";
import { calendarMarkForAllocation } from "@/lib/leave/services/leave-policy-engine";
import type { LeaveCalendarEntry, LeaveStatus } from "@/types/leave";

const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  approved: LEAVE_CALENDAR_LEGEND.approved.className,
  pending: LEAVE_CALENDAR_LEGEND.pending.className,
  rejected: "bg-destructive/60",
  cancelled: "bg-muted-foreground/30",
  withdrawn: "bg-violet-500/60",
};

/** Solid pill fills aligned with attendance calendar (CL purple, LOP dark grey/black). */
export const LEAVE_CALENDAR_TYPE_PILLS = {
  lop: "bg-zinc-900",
  casual_leave: "bg-violet-500",
  earned_leave: "bg-indigo-500",
} as const;

function isLopLeaveType(leave: LeaveCalendarEntry): boolean {
  const code = String(leave.leaveTypeCode ?? "").toUpperCase();
  if (code === "LOP") return true;
  const name = leave.leaveTypeName?.trim() ?? "";
  return /^LOP$/i.test(name) || /^loss\s+of\s+pay$/i.test(name);
}

function isCasualLeaveType(leave: LeaveCalendarEntry): boolean {
  const code = String(leave.leaveTypeCode ?? "").toUpperCase();
  if (code === "CL") return true;
  return /casual\s*leave/i.test(leave.leaveTypeName?.trim() ?? "");
}

function isEarnedLeaveType(leave: LeaveCalendarEntry): boolean {
  const code = String(leave.leaveTypeCode ?? "").toUpperCase();
  if (code === "EL") return true;
  return /earned\s*leave/i.test(leave.leaveTypeName?.trim() ?? "");
}

/** Label for a leave mark on a specific calendar date. */
export function leaveCalendarMarkLabel(
  leave: LeaveCalendarEntry,
  date: string,
  options?: { compact?: boolean },
): string {
  const allocation = leave.dayAllocations?.find((item) => item.date === date);
  if (allocation) {
    if (leave.hrReviewRequired && leave.leaveStatus === "pending" && !leave.hrDecision) {
      return "HR Review";
    }
    if (leave.hrDecision === "special") return "Special Leave";
    const mark = calendarMarkForAllocation(allocation.kind, leave.leaveTypeCode);
    if (mark) return mark;
  }
  if (isLopLeaveType(leave)) return "LOP";
  const type = leave.leaveTypeName?.trim();
  if (type && /optional/i.test(type)) return "Optional Holiday";
  if (type) return type;
  return options?.compact ? "Leave" : leave.employeeName;
}

/** Pill color for a leave mark on a specific calendar date. */
export function leaveCalendarPillClass(
  leave: LeaveCalendarEntry,
  date: string,
): string {
  const allocation = leave.dayAllocations?.find((item) => item.date === date);
  const mark = allocation
    ? calendarMarkForAllocation(allocation.kind, leave.leaveTypeCode)
    : null;

  if (allocation?.kind === "lop" || mark === "LOP" || isLopLeaveType(leave)) {
    return LEAVE_CALENDAR_TYPE_PILLS.lop;
  }
  if (mark === "Casual Leave" || (!mark && isCasualLeaveType(leave))) {
    return LEAVE_CALENDAR_TYPE_PILLS.casual_leave;
  }
  if (mark === "Earned Leave" || (!mark && isEarnedLeaveType(leave))) {
    return LEAVE_CALENDAR_TYPE_PILLS.earned_leave;
  }
  // Other leave types / statuses keep existing approval-status colors.
  return LEAVE_STATUS_COLORS[leave.leaveStatus];
}
