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
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data available.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.id}>
              <BarRow
                label={item.meta ? `${item.label} · ${item.meta}` : item.label}
                value={item.value}
                max={max}
                color="bg-emerald-500"
                formatValue={formatValue}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function CeoPerformanceTopPerformers({
  data,
}: {
  data: CeoPerformanceTopPerformers;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Top Performers</h2>
        <p className="text-xs text-muted-foreground">
          Highest rated employees, managers, departments, and goal achievers.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <RankList
          title="Top 10 Employees"
          items={data.topEmployees}
          formatValue={(value) => value.toFixed(1)}
        />
        <RankList
          title="Top 5 Managers"
          items={data.topManagers}
          formatValue={(value) => value.toFixed(1)}
        />
        <RankList
          title="Top Departments"
          items={data.topDepartments}
          formatValue={(value) => value.toFixed(1)}
        />
        <RankList
          title="Highest Goal Achievement"
          items={data.highestGoalAchievement}
          formatValue={(value) => `${value}%`}
        />
        <RankList
          title="Highest Rated Teams"
          items={data.highestRatedTeams}
          formatValue={(value) => value.toFixed(1)}
        />
      </div>
    </section>
  );
}
