import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsAttendance } from "@/types/ceo-analytics";

export function CeoAnalyticsAttendancePanel({
  attendance,
}: {
  attendance: CeoAnalyticsAttendance;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Attendance Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Compliance, WFH, leave load, and department attendance.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <CeoStatCard
          label="Attendance %"
          value={formatCeoPercent(attendance.attendancePercent)}
        />
        <CeoStatCard label="Late %" value={formatCeoPercent(attendance.latePercent)} />
        <CeoStatCard label="WFH %" value={formatCeoPercent(attendance.wfhPercent)} />
        <CeoStatCard label="Leave %" value={formatCeoPercent(attendance.leavePercent)} />
        <CeoStatCard
          label="Average Working Hours"
          value={`${attendance.averageWorkingHours.toFixed(1)} hrs`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <CeoChartPanel
          title="Department Attendance"
          items={attendance.departmentAttendance}
          color="bg-emerald-500"
        />
        <CeoChartPanel
          title="Attendance Heatmap"
          items={attendance.attendanceHeatmap}
          color="bg-amber-500"
        />
        <CeoChartPanel
          title="Monthly Attendance Trend"
          items={attendance.monthlyAttendanceTrend}
          color="bg-sky-500"
        />
      </div>
    </section>
  );
}
