import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsAttendance } from "@/types/ceo-analytics";

function hasChartData(items: { value: number }[]) {
  return items.some((item) => item.value !== 0);
}

export function CeoAnalyticsAttendancePanel({
  attendance,
}: {
  attendance: CeoAnalyticsAttendance;
}) {
  const hasStats =
    attendance.attendancePercent > 0 ||
    attendance.latePercent > 0 ||
    attendance.wfhPercent > 0 ||
    attendance.leavePercent > 0 ||
    attendance.averageWorkingHours > 0;

  const charts = [
    hasChartData(attendance.departmentAttendance) ? (
      <CeoChartPanel
        key="dept"
        title="Department Attendance"
        items={attendance.departmentAttendance}
        color="bg-emerald-500"
        formatValue={(value) => `${value}%`}
      />
    ) : null,
    hasChartData(attendance.monthlyAttendanceTrend) ? (
      <CeoChartPanel
        key="trend"
        title="Monthly Trend"
        items={attendance.monthlyAttendanceTrend}
        color="bg-sky-500"
        formatValue={(value) => `${value}%`}
      />
    ) : null,
  ].filter(Boolean);

  if (!hasStats && charts.length === 0) return null;

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Attendance</h2>
        <p className="text-xs text-muted-foreground">
          Compliance, leave load, and team attendance
        </p>
      </div>

      {hasStats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <CeoStatCard
            label="Attendance"
            value={formatCeoPercent(attendance.attendancePercent)}
          />
          <CeoStatCard
            label="Late"
            value={formatCeoPercent(attendance.latePercent)}
          />
          <CeoStatCard
            label="WFH"
            value={formatCeoPercent(attendance.wfhPercent)}
          />
          <CeoStatCard
            label="Leave"
            value={formatCeoPercent(attendance.leavePercent)}
          />
          <CeoStatCard
            label="Avg Hours"
            value={`${attendance.averageWorkingHours.toFixed(1)}h`}
          />
        </div>
      ) : null}

      {charts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">{charts}</div>
      ) : null}
    </section>
  );
}
