import type { ManagerReportsTrends } from "@/types/manager-reports";

function TrendChart({
  title,
  data,
  colorClass,
}: {
  title: string;
  data: { label: string; value: number }[];
  colorClass: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.length ? (
          data.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums">{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${colorClass}`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No trend data for this period.</p>
        )}
      </div>
    </div>
  );
}

export function ManagerReportsCharts({ trends }: { trends: ManagerReportsTrends }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Team Trends</h2>
        <p className="text-sm text-muted-foreground">
          Six-month trends for your reporting hierarchy only.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TrendChart title="Attendance Trend" data={trends.attendanceTrend} colorClass="bg-emerald-500" />
        <TrendChart title="Leave Trend" data={trends.leaveTrend} colorClass="bg-indigo-500" />
        <TrendChart title="Performance Trend" data={trends.performanceTrend} colorClass="bg-violet-500" />
        <TrendChart title="Hiring Trend" data={trends.hiringTrend} colorClass="bg-orange-500" />
        <TrendChart title="Monthly Team Growth" data={trends.teamGrowthTrend} colorClass="bg-sky-500" />
      </div>
    </section>
  );
}
