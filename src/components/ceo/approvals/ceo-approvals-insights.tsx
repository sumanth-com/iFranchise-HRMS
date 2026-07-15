import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoApprovalsInsights } from "@/types/ceo-approvals";

export function CeoApprovalsInsightsPanel({
  insights,
}: {
  insights: CeoApprovalsInsights;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Executive Insights</h2>
        <p className="text-xs text-muted-foreground">
          Pending load, turnaround, success rate, and monthly decision trends.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <CeoStatCard
          label="Approval Success Rate"
          value={formatCeoPercent(insights.approvalSuccessRate)}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <CeoStatCard
          label="Average Processing Time"
          value={`${insights.averageProcessingTimeHours.toFixed(1)} hrs`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <CeoChartPanel title="Pending by Department" items={insights.pendingByDepartment} />
        <CeoChartPanel
          title="Pending by Priority"
          items={insights.pendingByPriority}
          color="bg-amber-500"
        />
        <CeoChartPanel
          title="Approval Turnaround Time"
          items={insights.approvalTurnaroundHours}
          color="bg-sky-500"
        />
        <CeoChartPanel
          title="Monthly Approval Trend"
          items={insights.monthlyApprovalTrend}
          color="bg-emerald-500"
        />
      </div>
    </section>
  );
}
