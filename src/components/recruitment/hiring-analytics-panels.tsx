import { CANDIDATE_STAGE_LABELS } from "@/lib/recruitment/constants";
import type { AnalyticsSummary } from "@/types/recruitment";

export function HiringAnalyticsPanels({ analytics }: { analytics: AnalyticsSummary }) {
  const maxFunnel = Math.max(1, ...analytics.funnel.map((f) => f.count));
  const maxDept = Math.max(1, ...analytics.hiringByDepartment.map((d) => d.count));
  const maxSource = Math.max(1, ...analytics.sources.map((s) => s.count));
  const maxMonth = Math.max(1, ...analytics.monthlyHiring.map((m) => m.count));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hiring Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Funnel, conversion, sources, and hiring trends for leadership review.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Avg Time to Hire" value={`${analytics.averageTimeToHireDays} days`} />
        <MetricCard
          label="Interview Conversion"
          value={`${analytics.interviewConversionRate}%`}
        />
        <MetricCard label="Offer Acceptance" value={`${analytics.offerAcceptanceRate}%`} />
        <MetricCard
          label="Total in Funnel"
          value={String(analytics.funnel.reduce((s, f) => s + f.count, 0))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Hiring Funnel" subtitle="Candidates by stage">
          {analytics.funnel.map((item) => (
            <BarRow
              key={item.stage}
              label={CANDIDATE_STAGE_LABELS[item.stage]}
              value={item.count}
              max={maxFunnel}
              color="bg-primary"
            />
          ))}
        </ChartCard>

        <ChartCard title="Hiring by Department" subtitle="Joined candidates">
          {analytics.hiringByDepartment.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hires yet.</p>
          ) : (
            analytics.hiringByDepartment.map((item) => (
              <BarRow
                key={item.departmentName}
                label={item.departmentName}
                value={item.count}
                max={maxDept}
                color="bg-emerald-500"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Recruitment Sources" subtitle="Where candidates come from">
          {analytics.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No source data yet.</p>
          ) : (
            analytics.sources.map((item) => (
              <BarRow
                key={item.source}
                label={item.source}
                value={item.count}
                max={maxSource}
                color="bg-violet-500"
              />
            ))
          )}
        </ChartCard>

        <ChartCard title="Monthly Hiring" subtitle="Last 6 months">
          {analytics.monthlyHiring.map((item) => (
            <BarRow
              key={item.month}
              label={item.month}
              value={item.count}
              max={maxMonth}
              color="bg-amber-500"
            />
          ))}
        </ChartCard>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}
