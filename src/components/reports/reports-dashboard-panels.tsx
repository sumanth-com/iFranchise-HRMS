import {
  BarRow,
  ChartCard,
  MetricCard,
} from "@/components/reports/report-chart-cards";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import type { ChartSeriesItem, ExecutiveDashboard } from "@/types/reports";

function seriesMax(items: ChartSeriesItem[]) {
  return Math.max(1, ...items.map((item) => item.value));
}

export function ReportsDashboardPanels({
  dashboard,
}: {
  dashboard: ExecutiveDashboard;
}) {
  const { cards, charts } = dashboard;
  const employeeGrowth = charts.employeeGrowth.slice(-5);
  const departmentDistribution = charts.departmentDistribution.slice(0, 5);
  const attendanceTrend = charts.attendanceTrend.slice(-4);
  const leaveTrend = charts.leaveTrend.slice(-4);
  const payrollCostTrend = charts.payrollCostTrend.slice(-4);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Executive snapshot across HR, attendance, leave, payroll, and more.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:col-span-2">
          <MetricCard label="Total Employees" value={String(cards.totalEmployees)} />
          <MetricCard label="New Hires" value={String(cards.newHires)} />
          <MetricCard label="Attendance Today" value={String(cards.attendanceToday)} />
          <MetricCard label="Payroll Cost" value={formatCurrencyInr(cards.payrollCost)} />
          <MetricCard label="Open Recruitments" value={String(cards.openRecruitments)} />
          <MetricCard
            label="Avg Performance"
            value={cards.averagePerformanceRating > 0 ? cards.averagePerformanceRating.toFixed(1) : "—"}
          />
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Executive Trends</h2>
              <p className="text-xs text-muted-foreground">Headcount and department mix</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Live summary
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Employee Growth
              </h3>
              <div className="space-y-2">
                {charts.employeeGrowth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No growth data yet.</p>
                ) : (
                  employeeGrowth.map((item) => (
                    <BarRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      max={seriesMax(employeeGrowth)}
                      color="bg-primary"
                    />
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Departments
              </h3>
              <div className="space-y-2">
                {charts.departmentDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No department data yet.</p>
                ) : (
                  departmentDistribution.map((item) => (
                    <BarRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      max={seriesMax(departmentDistribution)}
                      color="bg-teal-500"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-5">
          <h2 className="text-sm font-semibold">Operations Snapshot</h2>
          <p className="mb-3 text-xs text-muted-foreground">Attendance, leave, payroll, and exits</p>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">People movement</p>
                <p className="mt-1 text-xl font-semibold">{cards.employeesLeft}</p>
                <p className="text-xs text-muted-foreground">Employees left</p>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Leave today</p>
                <p className="mt-1 text-xl font-semibold">{cards.employeesOnLeave}</p>
                <p className="text-xs text-muted-foreground">Employees on leave</p>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Performance</p>
                <p className="mt-1 text-xl font-semibold">
                  {cards.averagePerformanceRating > 0 ? cards.averagePerformanceRating.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Average rating</p>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Assets / exits</p>
                <p className="mt-1 text-xl font-semibold">
                  {cards.assetsAssigned} / {cards.pendingExitClearance}
                </p>
                <p className="text-xs text-muted-foreground">Assigned / pending clearance</p>
              </div>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent activity lines
              </h3>
              <div className="space-y-2.5">
                {attendanceTrend.slice(-2).map((item) => (
                  <BarRow key={`attendance-${item.label}`} label={`Attendance ${item.label}`} value={item.value} max={seriesMax(attendanceTrend)} color="bg-blue-500" />
                ))}
                {leaveTrend.slice(-1).map((item) => (
                  <BarRow key={`leave-${item.label}`} label={`Leave ${item.label}`} value={item.value} max={seriesMax(leaveTrend)} color="bg-violet-500" />
                ))}
                {payrollCostTrend.slice(-1).map((item) => (
                  <BarRow key={`payroll-${item.label}`} label={`Payroll ${item.label}`} value={item.value} max={seriesMax(payrollCostTrend)} color="bg-amber-500" formatValue={formatCurrencyInr} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
