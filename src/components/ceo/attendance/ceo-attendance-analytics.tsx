import { BarRow } from "@/components/reports/report-chart-cards";
import type { CeoAttendanceAnalytics } from "@/types/ceo-attendance";

function ChartBlock({
  title,
  items,
  color = "bg-primary",
  formatValue,
}: {
  title: string;
  items: { label: string; value: number }[];
  color?: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available.</p>
      ) : (
        <div className="space-y-2.5">
          {items.slice(0, 10).map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={max}
              color={color}
              formatValue={formatValue}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CeoAttendanceAnalytics({
  analytics,
}: {
  analytics: CeoAttendanceAnalytics;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Attendance Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Trends, comparisons, heatmap, and peak attendance days.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <ChartBlock
          title="Attendance Trend"
          items={analytics.attendanceTrend}
          formatValue={(value) => `${value}%`}
        />
        <ChartBlock
          title="Department Comparison"
          items={analytics.departmentComparison}
          color="bg-sky-500"
          formatValue={(value) => `${value}%`}
        />
        <ChartBlock
          title="Monthly Comparison"
          items={analytics.monthlyComparison}
          color="bg-indigo-500"
          formatValue={(value) => `${value}%`}
        />
        <ChartBlock
          title="Yearly Comparison"
          items={analytics.yearlyComparison}
          color="bg-violet-500"
          formatValue={(value) => `${value}%`}
        />
        <ChartBlock
          title="Late Arrival Trend"
          items={analytics.lateArrivalTrend}
          color="bg-amber-500"
        />
        <ChartBlock
          title="WFH Trend"
          items={analytics.wfhTrend}
          color="bg-cyan-500"
        />
        <ChartBlock
          title="Leave Trend"
          items={analytics.leaveTrend}
          color="bg-blue-500"
        />
        <ChartBlock
          title="Overtime Trend"
          items={analytics.overtimeTrend}
          color="bg-rose-500"
          formatValue={(value) => `${value} hrs`}
        />
        <ChartBlock
          title="Attendance Heatmap"
          items={analytics.attendanceHeatmap}
          color="bg-emerald-500"
          formatValue={(value) => `${value}%`}
        />
        <ChartBlock
          title="Peak Attendance Days"
          items={analytics.peakAttendanceDays}
          color="bg-orange-500"
        />
      </div>
    </section>
  );
}
