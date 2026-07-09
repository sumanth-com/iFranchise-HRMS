import { format } from "date-fns";

import { ChartCard, BarRow } from "@/components/reports/report-chart-cards";
import { formatAuditModule } from "@/lib/audit/constants";
import type { AuditDashboardStats } from "@/types/audit";

function seriesMax(items: { count: number }[]) {
  return Math.max(...items.map((i) => i.count), 1);
}

export function AuditDashboardPanels({ stats }: { stats: AuditDashboardStats }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Activity by Module" subtitle="Last 7 days">
        {stats.activityByModule.length === 0 ? (
          <p className="text-sm text-muted-foreground">No module activity yet.</p>
        ) : (
          stats.activityByModule.slice(0, 10).map((item) => (
            <BarRow
              key={item.module}
              label={formatAuditModule(item.module)}
              value={item.count}
              max={seriesMax(stats.activityByModule)}
            />
          ))
        )}
      </ChartCard>

      <ChartCard title="Activity by User" subtitle="Today">
        {stats.activityByUser.length === 0 ? (
          <p className="text-sm text-muted-foreground">No user activity today.</p>
        ) : (
          stats.activityByUser.map((item) => (
            <BarRow
              key={item.userId}
              label={item.userName}
              value={item.count}
              max={seriesMax(stats.activityByUser)}
            />
          ))
        )}
      </ChartCard>

      <ChartCard title="Activity Timeline" subtitle="Last 7 days" >
        {stats.activityTimeline.every((d) => d.count === 0) ? (
          <p className="text-sm text-muted-foreground">No timeline data yet.</p>
        ) : (
          stats.activityTimeline.map((item) => (
            <BarRow
              key={item.date}
              label={format(new Date(item.date), "EEE, MMM d")}
              value={item.count}
              max={seriesMax(stats.activityTimeline)}
              color="bg-violet-500"
            />
          ))
        )}
      </ChartCard>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold">Recent Changes</h3>
        {stats.recentChanges.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No recent audit entries.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {stats.recentChanges.map((item) => (
              <li key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium">{item.description ?? item.action}</p>
                <p className="text-xs text-muted-foreground">
                  {formatAuditModule(item.module)} · {item.userName ?? "System"} ·{" "}
                  {format(new Date(item.occurredAt), "MMM d, h:mm a")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
