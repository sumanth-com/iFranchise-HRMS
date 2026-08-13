import Link from "next/link";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Send,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { SectionHelpButton } from "@/components/common/section-help-button";
import { RecruitmentOverviewCard } from "@/components/recruitment/recruitment-overview-card";
import { RecruitmentPipelinePanel } from "@/components/recruitment/recruitment-pipeline-panel";
import { remapSubNavHref } from "@/lib/navigation/remap-sub-nav";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { HIRING_SECTION_HELP } from "@/lib/recruitment/section-help";
import { cn } from "@/lib/utils";
import type { RecruitmentSummary } from "@/types/recruitment";

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  iconBg,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  iconBg: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className={cn("rounded-lg p-1.5", iconBg)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
        <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}

export function RecruitmentDashboardView({
  summary,
  basePath = RECRUITMENT_ROUTES.dashboard,
  readOnly = false,
}: {
  summary: RecruitmentSummary;
  basePath?: string;
  readOnly?: boolean;
}) {
  void readOnly;
  const to = (href: string) =>
    remapSubNavHref(href, RECRUITMENT_ROUTES.dashboard, basePath);

  const ceoReviews =
    summary.candidatesByStage.find((item) => item.stage === "ceo")?.count ?? 0;
  const offerStage =
    summary.candidatesByStage.find((item) => item.stage === "offer")?.count ?? 0;

  return (
    <div className="flex h-[calc(100dvh-11.75rem)] min-h-0 flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <SectionHelpButton
          title={HIRING_SECTION_HELP.dashboard.title}
          points={[...HIRING_SECTION_HELP.dashboard.points]}
        >
          <h1 className="text-lg font-semibold tracking-tight">Recruitment</h1>
        </SectionHelpButton>
        <p className="text-xs text-muted-foreground">
          Pipeline, interviews, offers, and onboarding
        </p>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open roles"
          value={String(summary.openPositions)}
          hint={`${summary.hiresThisMonth} hires this month`}
          icon={Briefcase}
          iconBg="bg-sky-100 text-sky-600"
          href={to(RECRUITMENT_ROUTES.jobs)}
        />
        <MetricCard
          label="Active candidates"
          value={String(summary.activeCandidates)}
          hint={`${summary.interviewsToday} interviews today`}
          icon={Users}
          iconBg="bg-violet-100 text-violet-600"
          href={to(RECRUITMENT_ROUTES.candidates)}
        />
        <MetricCard
          label="Pending offers"
          value={String(summary.offersPending)}
          hint={`${summary.offersAccepted} accepted`}
          icon={FileText}
          iconBg="bg-amber-100 text-amber-600"
          href={to(RECRUITMENT_ROUTES.offers)}
        />
        <MetricCard
          label="Accepted offers"
          value={String(summary.offersAccepted)}
          hint="Ready for onboarding"
          icon={CheckCircle2}
          iconBg="bg-emerald-100 text-emerald-600"
          href={to(RECRUITMENT_ROUTES.onboarding)}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
          <RecruitmentPipelinePanel stages={summary.candidatesByStage} basePath={basePath} />
        </section>

        <div className="min-h-0">
          <RecruitmentOverviewCard overview={summary.overview} className="h-full" />
        </div>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Interviews today"
          value={String(summary.interviewsToday)}
          hint={`${summary.upcomingInterviews.length} upcoming`}
          icon={Calendar}
          iconBg="bg-sky-100 text-sky-600"
          href={to(RECRUITMENT_ROUTES.interviews)}
        />
        <MetricCard
          label="CEO reviews"
          value={String(ceoReviews)}
          hint="Awaiting executive review"
          icon={UserCheck}
          iconBg="bg-violet-100 text-violet-600"
          href={`${to(RECRUITMENT_ROUTES.candidates)}?stage=ceo`}
        />
        <MetricCard
          label="Hires this month"
          value={String(summary.hiresThisMonth)}
          hint={
            summary.averageHiringTimeDays > 0
              ? `${summary.averageHiringTimeDays}d avg time to hire`
              : "Joined this month"
          }
          icon={UserPlus}
          iconBg="bg-emerald-100 text-emerald-600"
          href={to(RECRUITMENT_ROUTES.onboarding)}
        />
        <MetricCard
          label="At offer stage"
          value={String(offerStage)}
          hint={
            summary.offersPending > 0
              ? `${summary.offersPending} offers pending send`
              : "Ready for offer"
          }
          icon={Send}
          iconBg="bg-amber-100 text-amber-600"
          href={`${to(RECRUITMENT_ROUTES.candidates)}?stage=offer`}
        />
      </div>
    </div>
  );
}
