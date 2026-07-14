import { CANDIDATE_STAGE_LABELS } from "@/lib/recruitment/constants";
import type { TeamRecruitmentAnalytics } from "@/types/manager-recruitment";

function MetricCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {value}
        {suffix ? <span className="text-base font-medium">{suffix}</span> : null}
      </p>
    </div>
  );
}

export function ManagerRecruitmentAnalytics({
  analytics,
}: {
  analytics: TeamRecruitmentAnalytics;
}) {
  const maxStageCount = Math.max(
    1,
    ...analytics.candidatesByStage.map((item) => item.count),
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Recruitment Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Hiring metrics for departments you manage.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Interview Success Rate"
          value={analytics.interviewSuccessRate}
          suffix="%"
        />
        <MetricCard label="Time to Hire" value={analytics.averageTimeToHireDays} suffix=" days" />
        <MetricCard
          label="Manager Interview Completion"
          value={analytics.managerInterviewCompletionRate}
          suffix="%"
        />
        <MetricCard
          label="Active Pipeline"
          value={analytics.candidatesByStage
            .filter((item) => !["joined", "rejected"].includes(item.stage))
            .reduce((sum, item) => sum + item.count, 0)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Candidates by Stage</h3>
          <div className="mt-4 space-y-3">
            {analytics.candidatesByStage.map((item) => (
              <div key={item.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{CANDIDATE_STAGE_LABELS[item.stage]}</span>
                  <span className="font-medium tabular-nums">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-indigo-500"
                    style={{ width: `${(item.count / maxStageCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Department Hiring Progress</h3>
          <div className="mt-4 space-y-3">
            {analytics.departmentHiringProgress.length ? (
              analytics.departmentHiringProgress.map((dept) => {
                const total = dept.openPositions + dept.filledCount;
                const pct = total > 0 ? Math.round((dept.filledCount / total) * 100) : 0;
                return (
                  <div key={dept.departmentId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{dept.departmentName}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {dept.filledCount} filled / {dept.openPositions} open
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No department hiring data yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
