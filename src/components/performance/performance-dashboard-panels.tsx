import { REVIEW_STATUS_LABELS } from "@/lib/performance/constants";
import type { PerformanceSummary } from "@/types/performance";

type PerformanceDashboardPanelsProps = {
  summary: PerformanceSummary;
};

export function PerformanceDashboardPanels({ summary }: PerformanceDashboardPanelsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Goal completion trend</h2>
        <p className="mb-4 text-xs text-muted-foreground">Monthly goal progress overview</p>
        <div className="space-y-3">
          {summary.goalProgressByMonth.map((item) => {
            const pct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
            return (
              <div key={item.month}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{item.month}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Department performance</h2>
        <p className="mb-4 text-xs text-muted-foreground">Average goal progress by department</p>
        <div className="space-y-3">
          {summary.departmentPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No department data yet.</p>
          ) : (
            summary.departmentPerformance.map((dept) => (
              <div key={dept.departmentId}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{dept.departmentName}</span>
                  <span className="text-muted-foreground">
                    {dept.averageProgress}% · {dept.goalCount} goals
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${dept.averageProgress}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2 xl:col-span-1">
        <h2 className="text-sm font-medium">KPI completion by department</h2>
        <p className="mb-4 text-xs text-muted-foreground">Average KPI completion across departments</p>
        <div className="space-y-3">
          {summary.kpiDepartmentPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No KPI data yet.</p>
          ) : (
            summary.kpiDepartmentPerformance.map((dept) => (
              <div key={dept.departmentId}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{dept.departmentName}</span>
                  <span className="text-muted-foreground">
                    {dept.averageProgress}% · {dept.goalCount} KPIs
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${dept.averageProgress}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2 xl:col-span-1">
        <h2 className="text-sm font-medium">Review status</h2>
        <p className="mb-4 text-xs text-muted-foreground">Current review pipeline breakdown</p>
        <div className="space-y-2">
          {summary.reviewStatusBreakdown.map((item) => (
            <div
              key={item.status}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>{REVIEW_STATUS_LABELS[item.status]}</span>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
