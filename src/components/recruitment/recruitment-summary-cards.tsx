import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  UserPlus,
  Users,
} from "lucide-react";

import type { RecruitmentSummary } from "@/types/recruitment";

const CARDS = [
  { key: "openPositions" as const, label: "Open Positions", icon: Briefcase, accent: "text-blue-600", bg: "bg-blue-500/10" },
  { key: "activeCandidates" as const, label: "Active Candidates", icon: Users, accent: "text-violet-600", bg: "bg-violet-500/10" },
  { key: "interviewsToday" as const, label: "Interviews Today", icon: Calendar, accent: "text-amber-600", bg: "bg-amber-500/10" },
  { key: "offersPending" as const, label: "Offers Pending", icon: FileText, accent: "text-orange-600", bg: "bg-orange-500/10" },
  { key: "offersAccepted" as const, label: "Offers Accepted", icon: CheckCircle2, accent: "text-emerald-600", bg: "bg-emerald-500/10" },
  { key: "hiresThisMonth" as const, label: "Hires This Month", icon: UserPlus, accent: "text-primary", bg: "bg-primary/10" },
  { key: "averageHiringTimeDays" as const, label: "Avg Hiring Time", icon: Clock, accent: "text-slate-600", bg: "bg-slate-500/10", suffix: " days" },
];

export function RecruitmentSummaryCards({ summary }: { summary: RecruitmentSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {summary[card.key]}
                  {"suffix" in card ? card.suffix : ""}
                </p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
