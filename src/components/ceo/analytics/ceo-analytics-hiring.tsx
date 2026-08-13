import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import {
  CeoAnalyticsEmptyNote,
  CeoAnalyticsSectionHeading,
} from "@/components/ceo/analytics/ceo-analytics-section-heading";
import type { CeoAnalyticsHiring } from "@/types/ceo-analytics";

function hasChartData(items: { value: number }[]) {
  return items.some((item) => item.value !== 0);
}

export function CeoAnalyticsHiringPanel({ hiring }: { hiring: CeoAnalyticsHiring }) {
  const hasStats =
    hiring.openPositions > 0 ||
    hiring.filledPositions > 0 ||
    hiring.offerAcceptanceRate > 0 ||
    hiring.timeToHireDays > 0;

  const charts = [
    hasChartData(hiring.hiringTrend) ? (
      <CeoChartPanel
        key="trend"
        title="Hiring Trend"
        items={hiring.hiringTrend}
        color="bg-sky-500"
      />
    ) : null,
    hasChartData(hiring.recruitmentFunnel) ? (
      <CeoChartPanel
        key="funnel"
        title="Recruitment Funnel"
        items={hiring.recruitmentFunnel}
        color="bg-indigo-500"
      />
    ) : null,
    hasChartData(hiring.recruitmentByDepartment) ? (
      <CeoChartPanel
        key="dept"
        title="Hiring by Department"
        items={hiring.recruitmentByDepartment}
        color="bg-violet-500"
      />
    ) : null,
  ].filter(Boolean);

  return (
    <section className="w-full space-y-3">
      <CeoAnalyticsSectionHeading
        title="Hiring"
        description="Open roles, funnel progress, and hiring outcomes"
        helpKey="hiring"
      />

      {hasStats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CeoStatCard
            label="Open Roles"
            value={String(hiring.openPositions)}
          />
          <CeoStatCard
            label="Filled"
            value={String(hiring.filledPositions)}
          />
          <CeoStatCard
            label="Offer Accept"
            value={formatCeoPercent(hiring.offerAcceptanceRate)}
          />
          <CeoStatCard
            label="Time to Hire"
            value={`${hiring.timeToHireDays}d`}
          />
        </div>
      ) : null}

      {charts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">{charts}</div>
      ) : null}

      {!hasStats && charts.length === 0 ? (
        <CeoAnalyticsEmptyNote message="No hiring data for this period." />
      ) : null}
    </section>
  );
}
