/** KPI label: unplanned absence and approved leave both count as not present. */
export const ABSENT_TODAY_SUMMARY_LABEL = "Absent Today";

export function absentTodayIncludingLeave(summary: {
  absentToday: number;
  onLeaveToday?: number;
}): number {
  return summary.absentToday + (summary.onLeaveToday ?? 0);
}

/** Attendance statuses treated as absent for daily presence KPIs. */
export const ABSENT_PRESENCE_STATUSES = ["absent", "on_leave"] as const;

export function isAbsentPresenceStatus(status: string): boolean {
  return status === "absent" || status === "on_leave";
}
