import type { PerformanceSummary } from "@/types/performance";

type PerformanceDashboardPanelsProps = {
  summary: PerformanceSummary;
};

export function PerformanceDashboardPanels({ summary }: PerformanceDashboardPanelsProps) {
  const goalTrend = summary.goalProgressByMonth.slice(-6);
  const departments = summary.departmentPerformance.slice(0, 6);
  const kpiDepartments = summary.kpiDepartmentPerformance.slice(0, 4);

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <section className="rounded-2xl border bg-card p-4 shadow-sm lg:col-span-2">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Goal completion trend</h2>
          <p className="text-xs text-muted-foreground">Recent monthly goal progress</p>
        </div>
        <div className="space-y-2.5">
          {goalTrend.map((item) => {
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

      <section className="rounded-2xl border bg-card p-4 shadow-sm lg:col-span-3">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Department performance</h2>
            <p className="text-xs text-muted-foreground">Average goal progress by department</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
            Live graph
          </span>
        </div>
        <div>
          {summary.departmentPerformance.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground">
              No department data yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_12rem]">
              <div className="flex h-48 items-end gap-3 rounded-xl bg-muted/30 px-4 pb-4 pt-6">
                {departments.map((dept) => {
                  const height = Math.max(dept.averageProgress, 6);
                  return (
                    <div key={dept.departmentId} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex h-36 w-full items-end justify-center">
                        <div
                          className="w-full max-w-12 rounded-t-2xl bg-gradient-to-t from-emerald-500 to-cyan-400 shadow-sm"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="w-full text-center">
                        <p className="truncate text-[11px] font-medium">{dept.departmentName}</p>
                        <p className="text-[10px] text-muted-foreground">{dept.averageProgress}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                {departments.slice(0, 4).map((dept) => (
                  <div key={dept.departmentId} className="rounded-xl border bg-background px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium">{dept.departmentName}</span>
                      <span className="text-muted-foreground">{dept.averageProgress}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{dept.goalCount} goals tracked</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm lg:col-span-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">KPI focus by department</h2>
            <p className="text-xs text-muted-foreground">Average KPI completion across teams</p>
          </div>
          {summary.employeesNeedingKpiReview > 0 ? (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700">
              {summary.employeesNeedingKpiReview} need review
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.kpiDepartmentPerformance.length === 0 ? (
            <div className="rounded-xl bg-muted/30 px-4 py-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
              No KPI data yet.
            </div>
          ) : (
            kpiDepartments.map((dept) => (
              <div key={dept.departmentId} className="rounded-xl border bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{dept.departmentName}</span>
                  <span className="text-muted-foreground">{dept.averageProgress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                    style={{ width: `${dept.averageProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{dept.goalCount} KPIs tracked</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
