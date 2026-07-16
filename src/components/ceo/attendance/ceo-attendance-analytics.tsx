import { BarRow } from "@/components/reports/report-chart-cards";
import type { CeoAttendanceAnalytics } from "@/types/ceo-attendance";

function TrendCard({
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
  const displayItems = items.filter((item) => item.value !== 0);
  if (displayItems.length === 0) return null;

  const max = Math.max(1, ...displayItems.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      <div className="space-y-2.5">
        {displayItems.slice(0, 6).map((item) => (
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
    </section>
  );
}

function hasNonZeroItems(items: { label: string; value: number }[]) {
  return items.some((item) => item.value !== 0);
}

export function CeoAttendanceAnalytics({
  analytics,
}: {
  analytics: CeoAttendanceAnalytics;
}) {
  const cards: React.ReactNode[] = [];

  if (hasNonZeroItems(analytics.attendanceTrend)) {
    cards.push(
      <TrendCard
        key="trend"
        title="Attendance Trend"
        items={analytics.attendanceTrend}
        formatValue={(value) => `${value}%`}
      />,
    );
  }

  if (hasNonZeroItems(analytics.departmentComparison)) {
    cards.push(
      <TrendCard
        key="departments"
        title="Department Comparison"
        items={analytics.departmentComparison}
        color="bg-sky-500"
        formatValue={(value) => `${value}%`}
      />,
    );
  }

  if (hasNonZeroItems(analytics.lateArrivalTrend)) {
    cards.push(
      <TrendCard
        key="late"
        title="Late Arrival Trend"
        items={analytics.lateArrivalTrend}
        color="bg-amber-500"
      />,
    );
  }

  if (hasNonZeroItems(analytics.leaveTrend)) {
    cards.push(
      <TrendCard
        key="leave"
        title="Leave Trend"
        items={analytics.leaveTrend}
        color="bg-blue-500"
      />,
    );
  }

  if (hasNonZeroItems(analytics.wfhTrend)) {
    cards.push(
      <TrendCard
        key="wfh"
        title="WFH Trend"
        items={analytics.wfhTrend}
        color="bg-cyan-500"
      />,
    );
  }

  if (hasNonZeroItems(analytics.overtimeTrend)) {
    cards.push(
      <TrendCard
        key="overtime"
        title="Overtime Trend"
        items={analytics.overtimeTrend}
        color="bg-rose-500"
        formatValue={(value) => `${value} hrs`}
      />,
    );
  }

  if (cards.length === 0) return null;

  return (
    <section className="w-full">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Attendance Trends</h2>
        <p className="text-xs text-muted-foreground">
          Company-wide patterns for the selected period
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{cards}</div>
    </section>
  );
}
