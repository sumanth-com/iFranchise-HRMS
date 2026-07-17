import { CeoChartPanel } from "@/components/ceo/ceo-module-primitives";
import { MetricCard } from "@/components/reports/report-chart-cards";
import type { CeoLeaveAnalytics } from "@/types/ceo-leave";

export function CeoLeaveAnalyticsPanel({
  analytics,
}: {
  analytics: CeoLeaveAnalytics;
}) {
  const hasTrend = analytics.monthlyTrend.some((item) => item.value > 0);
  const hasDept = analytics.departmentDistribution.length > 0;
  const hasType = analytics.leaveTypeDistribution.length > 0;

  const approvalLabel =
    analytics.averageApprovalHours == null
      ? "—"
      : analytics.averageApprovalHours >= 24
        ? `${(analytics.averageApprovalHours / 24).toFixed(1)} days`
        : `${analytics.averageApprovalHours} hrs`;
  const durationLabel =
    analytics.averageLeaveDurationDays == null
      ? "—"
      : `${analytics.averageLeaveDurationDays} days`;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">Leave Analytics</h2>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Avg Approval Time" value={approvalLabel} />
        <MetricCard label="Avg Leave Duration" value={durationLabel} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {hasTrend ? (
          <CeoChartPanel
            title="Monthly Leave Trend"
            items={analytics.monthlyTrend}
            color="bg-sky-500"
          />
        ) : (
          <EmptyChart title="Monthly Leave Trend" />
        )}
        {hasDept ? (
          <CeoChartPanel
            title="Department Leave Distribution"
            items={analytics.departmentDistribution}
            color="bg-violet-500"
            variant="rows"
          />
        ) : (
          <EmptyChart title="Department Leave Distribution" />
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {hasType ? (
          <CeoChartPanel
            title="Leave Type Distribution"
            items={analytics.leaveTypeDistribution}
            color="bg-emerald-500"
            variant="rows"
          />
        ) : (
          <EmptyChart title="Leave Type Distribution" />
        )}
      </div>
    </section>
  );
}

function EmptyChart({ title }: { title: string }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-tight">{title}</h2>
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
        Not enough data yet.
      </div>
    </section>
  );
}
