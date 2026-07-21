import { format } from "date-fns";

import { CandidatesByStagePipeline } from "@/components/recruitment/candidates-by-stage-pipeline";
import { RecruitmentFlowGuide } from "@/components/recruitment/recruitment-flow-guide";
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/recruitment/constants";
import type { RecruitmentSummary } from "@/types/recruitment";

export function RecruitmentDashboardPanels({ summary }: { summary: RecruitmentSummary }) {
  const maxDept = Math.max(1, ...summary.hiringByDepartment.map((d) => d.count));
  const departments = summary.hiringByDepartment.slice(0, 6);
  const interviews = summary.upcomingInterviews.slice(0, 3);
  const activity = summary.recentActivity.slice(0, 4);

  return (
    <div className="grid gap-3 xl:grid-cols-6">
      <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-2">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Candidates by stage</h2>
          <p className="text-xs text-muted-foreground">Hiring pipeline funnel</p>
        </div>
        <CandidatesByStagePipeline stages={summary.candidatesByStage} />
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-2">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Hiring by department</h2>
          <p className="text-xs text-muted-foreground">Joined candidates by department</p>
        </div>
        <div>
          {summary.hiringByDepartment.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground">
              No hires yet.
            </div>
          ) : (
            <div className="flex h-40 items-end gap-3 rounded-xl bg-muted/30 px-4 pb-3 pt-5">
              {departments.map((dept) => {
                const height = Math.max((dept.count / maxDept) * 100, 8);
                return (
                  <div key={dept.departmentId} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end justify-center">
                      <div
                        className="w-full max-w-10 rounded-t-2xl bg-gradient-to-t from-emerald-500 to-cyan-400"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="w-full text-center">
                      <p className="truncate text-[10px] font-medium">{dept.departmentName}</p>
                      <p className="text-[10px] text-muted-foreground">{dept.count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-2">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Upcoming interviews</h2>
          <p className="text-xs text-muted-foreground">Next scheduled interviews</p>
        </div>
        <div className="space-y-2">
          {summary.upcomingInterviews.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground">
              No upcoming interviews.
            </div>
          ) : (
            interviews.map((item) => (
              <div key={item.id} className="rounded-xl border bg-background px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{item.candidateName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {INTERVIEW_STATUS_LABELS[item.interviewStatus]}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {item.roundName} · {item.interviewDate} {item.interviewTime} ·{" "}
                  {INTERVIEW_TYPE_LABELS[item.interviewType]}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="xl:col-span-6">
        <RecruitmentFlowGuide sources={summary.candidateSources} />
      </div>

      <section className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <p className="text-xs text-muted-foreground">Latest recruitment timeline events</p>
          </div>
          {summary.recentActivity.length > activity.length ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Latest {activity.length}
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {summary.recentActivity.length === 0 ? (
            <div className="rounded-xl bg-muted/30 px-4 py-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
              No activity yet.
            </div>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="rounded-xl border bg-background px-3 py-2">
                <div className="flex gap-2">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.candidateName ? `${item.candidateName} · ` : ""}
                      {format(new Date(item.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
