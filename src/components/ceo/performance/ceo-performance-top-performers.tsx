import { BarRow } from "@/components/reports/report-chart-cards";
import type { CeoPerformanceTopPerformers } from "@/types/ceo-performance";

function RankList({
  title,
  items,
  formatValue,
}: {
  title: string;
  items: { id: string; label: string; value: number; meta?: string }[];
  formatValue?: (value: number) => string;
}) {
  const displayItems = items.filter((item) => item.value > 0);
  if (displayItems.length === 0) return null;

  const max = Math.max(1, ...displayItems.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2.5">
        {displayItems.slice(0, 5).map((item) => (
          <BarRow
            key={item.id}
            label={item.meta ? `${item.label} · ${item.meta}` : item.label}
            value={item.value}
            max={max}
            color="bg-emerald-500"
            formatValue={formatValue}
          />
        ))}
      </div>
    </section>
  );
}

export function CeoPerformanceTopPerformers({
  data,
}: {
  data: CeoPerformanceTopPerformers;
}) {
  const blocks = [
    data.topEmployees.some((item) => item.value > 0) ? (
      <RankList
        key="employees"
        title="Top Employees"
        items={data.topEmployees}
        formatValue={(value) => value.toFixed(1)}
      />
    ) : null,
    data.topDepartments.some((item) => item.value > 0) ? (
      <RankList
        key="departments"
        title="Top Departments"
        items={data.topDepartments}
        formatValue={(value) => value.toFixed(1)}
      />
    ) : null,
    data.highestGoalAchievement.some((item) => item.value > 0) ? (
      <RankList
        key="goals"
        title="Goal Leaders"
        items={data.highestGoalAchievement}
        formatValue={(value) => `${value}%`}
      />
    ) : null,
  ].filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <section className="w-full">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Top Performers</h2>
        <p className="text-xs text-muted-foreground">
          Highest rated people and teams
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{blocks}</div>
    </section>
  );
}
