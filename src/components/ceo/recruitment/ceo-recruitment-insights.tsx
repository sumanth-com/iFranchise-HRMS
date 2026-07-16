import { BarRow } from "@/components/reports/report-chart-cards";
import {
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoRecruitmentInsights } from "@/types/ceo-recruitment";

function ChartBlock({
  title,
  items,
  color = "bg-primary",
}: {
  title: string;
  items: { label: string; value: number }[];
  color?: string;
}) {
  const displayItems = items.filter((item) => item.value !== 0);
  const max = Math.max(1, ...displayItems.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {displayItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available.</p>
      ) : (
        <div className="space-y-2.5">
          {displayItems.slice(0, 8).map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={max}
              color={color}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CeoRecruitmentInsights({
  insights,
}: {
  insights: CeoRecruitmentInsights;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Hiring Insights</h2>
        <p className="text-xs text-muted-foreground">
          Funnel health, hiring trends, and recruiter outcomes for the selected scope.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <CeoStatCard
          label="Interview Success Rate"
          value={formatCeoPercent(insights.interviewSuccessRate)}
        />
        <CeoStatCard
          label="Offer Acceptance %"
          value={formatCeoPercent(insights.offerAcceptanceRate)}
        />
        <CeoStatCard
          label="Average Hiring Time"
          value={`${insights.averageHiringTimeDays} days`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartBlock title="Hiring by Department" items={insights.hiringByDepartment} />
        <ChartBlock
          title="Hiring Trend (Monthly)"
          items={insights.hiringTrend}
          color="bg-sky-500"
        />
        <ChartBlock
          title="Recruitment Funnel"
          items={insights.funnel}
          color="bg-indigo-500"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ChartBlock
          title="Open vs Closed Positions"
          items={insights.openVsClosed}
          color="bg-emerald-500"
        />
        <ChartBlock
          title="Top Hiring Departments"
          items={insights.topHiringDepartments}
          color="bg-amber-500"
        />
        <ChartBlock
          title="Recruiter Performance"
          items={insights.recruiterPerformance}
          color="bg-rose-500"
        />
      </div>
    </section>
  );
}
