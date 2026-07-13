import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Users,
} from "lucide-react";

import type { RecruitmentSummary } from "@/types/recruitment";

const CARDS = [
  {
    label: "Open positions",
    value: (summary: RecruitmentSummary) => summary.openPositions,
    helper: (summary: RecruitmentSummary) => `${summary.hiresThisMonth} hires this month`,
    icon: Briefcase,
    accent: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    label: "Active candidates",
    value: (summary: RecruitmentSummary) => summary.activeCandidates,
    helper: (summary: RecruitmentSummary) => `${summary.interviewsToday} interviews today`,
    icon: Users,
    accent: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  {
    label: "Pending offers",
    value: (summary: RecruitmentSummary) => summary.offersPending,
    helper: (summary: RecruitmentSummary) => `${summary.offersAccepted} accepted offers`,
    icon: FileText,
    accent: "text-orange-600",
    bg: "bg-orange-500/10",
  },
  {
    label: "Accepted offers",
    value: (summary: RecruitmentSummary) => summary.offersAccepted,
    helper: () => "Ready for onboarding",
    icon: CheckCircle2,
    accent: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Avg hiring time",
    value: (summary: RecruitmentSummary) => `${summary.averageHiringTimeDays}d`,
    helper: () => "Time to close roles",
    icon: Clock,
    accent: "text-slate-600",
    bg: "bg-slate-500/10",
  },
];

export function RecruitmentSummaryCards({ summary }: { summary: RecruitmentSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{card.value(summary)}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{card.helper(summary)}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
