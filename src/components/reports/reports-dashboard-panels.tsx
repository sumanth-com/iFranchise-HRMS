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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Executive snapshot across HR, attendance, leave, payroll, and more.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total Employees" value={String(cards.totalEmployees)} />
        <MetricCard label="New Hires" value={String(cards.newHires)} />
        <MetricCard label="Employees Left" value={String(cards.employeesLeft)} />
        <MetricCard label="Attendance Today" value={String(cards.attendanceToday)} />
        <MetricCard label="On Leave" value={String(cards.employeesOnLeave)} />
        <MetricCard label="Payroll Cost" value={formatCurrencyInr(cards.payrollCost)} />
        <MetricCard
          label="Avg Performance"
          value={
            cards.averagePerformanceRating > 0
              ? cards.averagePerformanceRating.toFixed(1)
              : "—"
          }
        />
        <MetricCard label="Open Recruitments" value={String(cards.openRecruitments)} />
        <MetricCard label="Assets Assigned" value={String(cards.assetsAssigned)} />
        <MetricCard
          label="Pending Exit Clearance"
          value={String(cards.pendingExitClearance)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Employee Growth" subtitle="Headcount trend">
          {charts.employeeGrowth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No growth data yet.</p>
          ) : (
            charts.employeeGrowth.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.employeeGrowth)}
                color="bg-primary"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Hiring Trend" subtitle="New joiners by period">
          {charts.hiringTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hiring data yet.</p>
          ) : (
            charts.hiringTrend.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.hiringTrend)}
                color="bg-emerald-500"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Attrition Trend" subtitle="Exits by period">
          {charts.attritionTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attrition data yet.</p>
          ) : (
            charts.attritionTrend.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.attritionTrend)}
                color="bg-destructive/80"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Attendance Trend" subtitle="Present marks by period">
          {charts.attendanceTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance data yet.</p>
          ) : (
            charts.attendanceTrend.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.attendanceTrend)}
                color="bg-blue-500"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Leave Trend" subtitle="Approved leave volume">
          {charts.leaveTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave data yet.</p>
          ) : (
            charts.leaveTrend.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.leaveTrend)}
                color="bg-violet-500"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Payroll Cost Trend" subtitle="Period payroll totals">
          {charts.payrollCostTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll data yet.</p>
          ) : (
            charts.payrollCostTrend.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.payrollCostTrend)}
                color="bg-amber-500"
                formatValue={formatCurrencyInr}
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Department Distribution" subtitle="Headcount by department">
          {charts.departmentDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No department data yet.</p>
          ) : (
            charts.departmentDistribution.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.departmentDistribution)}
                color="bg-teal-500"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Performance Distribution" subtitle="Rating bands">
          {charts.performanceDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No performance data yet.</p>
          ) : (
            charts.performanceDistribution.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.performanceDistribution)}
                color="bg-indigo-500"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Recruitment Funnel" subtitle="Candidates by stage">
          {charts.recruitmentFunnel.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recruitment data yet.</p>
          ) : (
            charts.recruitmentFunnel.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.recruitmentFunnel)}
                color="bg-sky-500"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Asset Allocation" subtitle="Assigned vs available">
          {charts.assetAllocation.length === 0 ? (
            <p className="text-sm text-muted-foreground">No asset data yet.</p>
          ) : (
            charts.assetAllocation.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={seriesMax(charts.assetAllocation)}
                color="bg-orange-500"
              />
            ))
          )}
        </ChartCard>
      </div>
    </div>
  );
}
