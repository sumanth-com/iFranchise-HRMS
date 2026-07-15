import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAttendanceOverview } from "@/types/ceo-attendance";

export function CeoAttendanceOverviewPanel({
  overview,
}: {
  overview: CeoAttendanceOverview;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Company Attendance Overview</h2>
        <p className="text-xs text-muted-foreground">
          Company-wide attendance rates, clock averages, and trend.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <CeoStatCard
          label="Overall Attendance %"
          value={formatCeoPercent(overview.overallAttendancePercent)}
        />
        <CeoStatCard
          label="Monthly Attendance %"
          value={formatCeoPercent(overview.monthlyAttendancePercent)}
        />
        <CeoStatCard
          label="Yearly Attendance %"
          value={formatCeoPercent(overview.yearlyAttendancePercent)}
        />
        <CeoStatCard
          label="Average Check In Time"
          value={overview.averageCheckInTime ?? "—"}
        />
        <CeoStatCard
          label="Average Check Out Time"
          value={overview.averageCheckOutTime ?? "—"}
        />
        <CeoStatCard
          label="Average Working Hours"
          value={`${overview.averageWorkingHours.toFixed(1)} hrs`}
        />
      </div>

      <CeoChartPanel
        title="Attendance Trend"
        items={overview.attendanceTrend}
        color="bg-sky-500"
        formatValue={(value) => `${value}%`}
      />
    </section>
  );
}
