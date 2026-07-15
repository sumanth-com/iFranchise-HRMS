import {
  CeoChartPanel,
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAnalyticsHiring } from "@/types/ceo-analytics";

export function CeoAnalyticsHiringPanel({ hiring }: { hiring: CeoAnalyticsHiring }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Hiring Analytics</h2>
        <p className="text-xs text-muted-foreground">
          Funnel, time-to-hire, open roles, and recruiter outcomes.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CeoStatCard
          label="Offer Acceptance Rate"
          value={formatCeoPercent(hiring.offerAcceptanceRate)}
        />
        <CeoStatCard label="Time To Hire" value={`${hiring.timeToHireDays} days`} />
        <CeoStatCard label="Open Positions" value={String(hiring.openPositions)} />
        <CeoStatCard label="Filled Positions" value={String(hiring.filledPositions)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <CeoChartPanel title="Hiring Trend" items={hiring.hiringTrend} color="bg-sky-500" />
        <CeoChartPanel
          title="Recruitment Funnel"
          items={hiring.recruitmentFunnel}
          color="bg-indigo-500"
        />
        <CeoChartPanel
          title="Recruitment by Department"
          items={hiring.recruitmentByDepartment}
          color="bg-violet-500"
        />
        <CeoChartPanel
          title="Recruiter Performance"
          items={hiring.recruiterPerformance}
          color="bg-emerald-500"
        />
      </div>
    </section>
  );
}
