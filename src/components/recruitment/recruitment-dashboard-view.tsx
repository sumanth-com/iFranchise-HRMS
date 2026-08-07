import { Briefcase, CheckCircle2, FileText, Users } from "lucide-react";

import { RecruitmentDashboardBottomPanels } from "@/components/recruitment/recruitment-dashboard-bottom-panels";
import { RecruitmentPipelinePanel } from "@/components/recruitment/recruitment-pipeline-panel";
import { UpcomingInterviewsPanel } from "@/components/recruitment/upcoming-interviews-panel";
import { cn } from "@/lib/utils";
import type { RecruitmentSummary } from "@/types/recruitment";

const METRICS = [
  {
    label: "Open roles",
    value: (s: RecruitmentSummary) => s.openPositions,
    hint: (s: RecruitmentSummary) => `${s.hiresThisMonth} hires this month`,
    icon: Briefcase,
    iconBg: "bg-sky-100 text-sky-600",
  },
  {
    label: "Active candidates",
    value: (s: RecruitmentSummary) => s.activeCandidates,
    hint: (s: RecruitmentSummary) => `${s.interviewsToday} interviews today`,
    icon: Users,
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    label: "Pending offers",
    value: (s: RecruitmentSummary) => s.offersPending,
    hint: (s: RecruitmentSummary) => `${s.offersAccepted} accepted`,
    icon: FileText,
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    label: "Accepted offers",
    value: (s: RecruitmentSummary) => s.offersAccepted,
    hint: () => "Ready for onboarding",
    icon: CheckCircle2,
    iconBg: "bg-emerald-100 text-emerald-600",
  },
] as const;

export function RecruitmentDashboardView({ summary }: { summary: RecruitmentSummary }) {
  return (
    <div className="flex h-[calc(100dvh-11.75rem)] min-h-0 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Recruitment</h1>
        <p className="text-xs text-muted-foreground">
          Pipeline, interviews, offers, and onboarding
        </p>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 shadow-sm"
            >
              <div className={cn("rounded-lg p-1.5", metric.iconBg)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-lg font-semibold tabular-nums leading-tight">
                  {metric.value(summary)}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">{metric.hint(summary)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
          <RecruitmentPipelinePanel stages={summary.candidatesByStage} />
        </section>

        <div className="min-h-0">
          <UpcomingInterviewsPanel tracks={summary.interviewTracks} limit={3} className="h-full" />
        </div>
      </div>

      <RecruitmentDashboardBottomPanels
        openJobs={summary.openJobSnapshots}
        candidatesByStage={summary.candidatesByStage}
        offersPending={summary.offersPending}
      />
    </div>
  );
}
