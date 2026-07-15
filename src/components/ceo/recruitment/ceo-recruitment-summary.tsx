import {
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoRecruitmentKpis } from "@/types/ceo-recruitment";

export function CeoRecruitmentSummary({ kpis }: { kpis: CeoRecruitmentKpis }) {
  return (
    <section
      aria-label="Recruitment KPIs"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"
    >
      <CeoStatCard label="Open Positions" value={String(kpis.openPositions)} />
      <CeoStatCard label="Total Candidates" value={String(kpis.totalCandidates)} />
      <CeoStatCard label="Interviews Today" value={String(kpis.interviewsToday)} />
      <CeoStatCard label="Interviews This Week" value={String(kpis.interviewsThisWeek)} />
      <CeoStatCard
        label="Offers Pending"
        value={String(kpis.offersPending)}
        accent="text-amber-600 dark:text-amber-400"
      />
      <CeoStatCard
        label="Offers Accepted"
        value={String(kpis.offersAccepted)}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <CeoStatCard label="Hires This Month" value={String(kpis.hiresThisMonth)} />
      <CeoStatCard
        label="Average Time to Hire"
        value={`${kpis.averageTimeToHireDays} days`}
      />
      <CeoStatCard
        label="Offer Acceptance Rate"
        value={formatCeoPercent(kpis.offerAcceptanceRate)}
      />
      <CeoStatCard
        label="Recruitment Success Rate"
        value={formatCeoPercent(kpis.recruitmentSuccessRate)}
      />
    </section>
  );
}
