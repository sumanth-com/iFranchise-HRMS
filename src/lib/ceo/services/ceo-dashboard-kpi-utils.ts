/**
 * Pure CEO home KPI derivation from authoritative attendance summary fields.
 *
 * `getAttendanceSummary` (org-wide) returns:
 * - presentToday = present + half_day
 * - absentToday = absent + on_leave
 * - lateToday / halfDayToday / onLeaveToday as raw counts
 * - totalEmployees = active attendance workforce (directory-aligned roster)
 */

export type CeoAttendanceSummaryInput = {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  halfDayToday: number;
  onLeaveToday: number;
  totalEmployees: number;
};

export type CeoAttendanceKpiDerived = {
  /** Active attendance workforce headcount (Employees KPI). */
  totalEmployees: number;
  /** Present for % and Today's Workforce Present (present + half_day + late). */
  presentCount: number;
  /** Raw present+half_day for UI fields that still add late separately. */
  presentToday: number;
  lateToday: number;
  /** Actual absent only (leave peeled off). */
  absentToday: number;
  onLeaveToday: number;
  /** Present / total × 100, two decimal places (e.g. 14/17 → 82.35). */
  attendancePercent: number;
};

export function roundAttendancePercent(presentCount: number, totalEmployees: number): number {
  if (totalEmployees <= 0) return 0;
  return Math.round((presentCount / totalEmployees) * 10000) / 100;
}

export function deriveCeoAttendanceKpis(
  attendance: CeoAttendanceSummaryInput,
): CeoAttendanceKpiDerived {
  const totalEmployees = Math.max(0, Number(attendance.totalEmployees) || 0);
  const presentToday = Math.max(0, Number(attendance.presentToday) || 0);
  const lateToday = Math.max(0, Number(attendance.lateToday) || 0);
  const onLeaveToday = Math.max(0, Number(attendance.onLeaveToday) || 0);
  // Org-wide summary folds leave into absentToday — peel it back for Today's Workforce.
  const absentToday = Math.max(
    0,
    (Number(attendance.absentToday) || 0) - onLeaveToday,
  );
  const presentCount = presentToday + lateToday;

  return {
    totalEmployees,
    presentCount,
    presentToday,
    lateToday,
    absentToday,
    onLeaveToday,
    attendancePercent: roundAttendancePercent(presentCount, totalEmployees),
  };
}
