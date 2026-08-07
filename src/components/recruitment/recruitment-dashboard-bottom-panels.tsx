import Link from "next/link";
import { ArrowRight, Briefcase, UserPlus } from "lucide-react";

import { CANDIDATE_STAGE_LABELS, RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import type { CandidateStage, OpenJobSnapshot } from "@/types/recruitment";

const ACTION_STAGES: CandidateStage[] = ["screening", "technical", "hr", "ceo", "offer"];

export function RecruitmentDashboardBottomPanels({
  openJobs,
  candidatesByStage,
  offersPending,
}: {
  openJobs: OpenJobSnapshot[];
  candidatesByStage: { stage: CandidateStage; count: number }[];
  offersPending: number;
}) {
  const stageActions = ACTION_STAGES
    .map((stage) => ({
      stage,
      count: candidatesByStage.find((s) => s.stage === stage)?.count ?? 0,
    }))
    .filter((s) => s.count > 0);

  return (
    <div className="grid shrink-0 gap-2 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Open roles</h2>
              <p className="text-[10px] text-muted-foreground">Active hiring positions</p>
            </div>
          </div>
          <Link
            href={RECRUITMENT_ROUTES.jobs}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            Manage jobs
          </Link>
        </div>

        {openJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
            No open roles.{" "}
            <Link href={RECRUITMENT_ROUTES.jobs} className="font-medium text-primary hover:underline">
              Create a job opening
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {openJobs.map((job) => (
              <Link
                key={job.id}
                href={`${RECRUITMENT_ROUTES.candidates}?jobOpeningId=${job.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border bg-background px-2.5 py-2 transition hover:border-primary/30 hover:bg-muted/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{job.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {job.candidateCount} active candidate{job.candidateCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[10px]">
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                    {job.openPositions} open
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Pipeline actions</h2>
              <p className="text-[10px] text-muted-foreground">Candidates needing movement</p>
            </div>
          </div>
          <Link
            href={RECRUITMENT_ROUTES.candidates}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            All candidates
          </Link>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-2">
          {offersPending > 0 ? (
            <Link
              href={RECRUITMENT_ROUTES.offers}
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 py-2 transition hover:border-amber-300"
            >
              <span className="text-xs font-medium text-amber-900">Pending offers</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-amber-800">
                {offersPending}
              </span>
            </Link>
          ) : null}

          {stageActions.length === 0 && offersPending === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground sm:col-span-2">
              Pipeline is clear — no candidates waiting in active stages.
            </div>
          ) : (
            stageActions.map(({ stage, count }) => (
              <Link
                key={stage}
                href={`${RECRUITMENT_ROUTES.candidates}?stage=${stage}`}
                className="flex items-center justify-between rounded-lg border bg-background px-2.5 py-2 transition hover:border-primary/30 hover:bg-muted/20"
              >
                <span className="text-xs font-medium">{CANDIDATE_STAGE_LABELS[stage]}</span>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold tabular-nums text-violet-700">
                  {count}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
