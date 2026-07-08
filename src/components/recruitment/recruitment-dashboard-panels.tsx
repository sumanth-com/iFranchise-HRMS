import { format } from "date-fns";

import {
  CANDIDATE_STAGE_LABELS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/recruitment/constants";
import type { RecruitmentSummary } from "@/types/recruitment";

export function RecruitmentDashboardPanels({ summary }: { summary: RecruitmentSummary }) {
  const maxStage = Math.max(1, ...summary.candidatesByStage.map((s) => s.count));
  const maxDept = Math.max(1, ...summary.hiringByDepartment.map((d) => d.count));

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Candidates by Stage</h2>
        <p className="mb-4 text-xs text-muted-foreground">Hiring pipeline distribution</p>
        <div className="space-y-3">
          {summary.candidatesByStage.map((item) => (
            <div key={item.stage}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{CANDIDATE_STAGE_LABELS[item.stage]}</span>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(item.count / maxStage) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Hiring by Department</h2>
        <p className="mb-4 text-xs text-muted-foreground">Joined candidates by department</p>
        <div className="space-y-3">
          {summary.hiringByDepartment.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hires yet.</p>
          ) : (
            summary.hiringByDepartment.map((dept) => (
              <div key={dept.departmentId}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{dept.departmentName}</span>
                  <span className="text-muted-foreground">{dept.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(dept.count / maxDept) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2 xl:col-span-1">
        <h2 className="text-sm font-medium">Upcoming Interviews</h2>
        <p className="mb-4 text-xs text-muted-foreground">Next scheduled interviews</p>
        <div className="space-y-2">
          {summary.upcomingInterviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming interviews.</p>
          ) : (
            summary.upcomingInterviews.map((item) => (
              <div key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.candidateName}</span>
                  <span className="text-xs text-muted-foreground">
                    {INTERVIEW_STATUS_LABELS[item.interviewStatus]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.roundName} · {item.interviewDate} {item.interviewTime} ·{" "}
                  {INTERVIEW_TYPE_LABELS[item.interviewType]}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-2 xl:col-span-3">
        <h2 className="text-sm font-medium">Recent Activity</h2>
        <p className="mb-4 text-xs text-muted-foreground">Latest recruitment timeline events</p>
        <div className="space-y-3">
          {summary.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            summary.recentActivity.map((item) => (
              <div key={item.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.candidateName ? `${item.candidateName} · ` : ""}
                    {format(new Date(item.createdAt), "MMM d, yyyy · h:mm a")}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
