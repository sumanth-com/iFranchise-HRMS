import { format } from "date-fns";
import Link from "next/link";

import { BarRow } from "@/components/reports/report-chart-cards";
import { AUDIT_ROUTES, formatAuditModule } from "@/lib/audit/constants";
import { humanizeActivityDescription } from "@/lib/common/display-text";
import { cn } from "@/lib/utils";
import type { AuditDashboardStats } from "@/types/audit";

function seriesMax(items: { count: number }[]) {
  return Math.max(...items.map((i) => i.count), 1);
}

function AuditPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="shrink-0">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">{children}</div>
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export function AuditDashboardPanels({ stats }: { stats: AuditDashboardStats }) {
  const moduleMax = seriesMax(stats.activityByModule);
  const userMax = seriesMax(stats.activityByUser);
  const timelineMax = seriesMax(stats.activityTimeline);

  return (
    <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
      <AuditPanel title="Activity by Module" subtitle="Last 7 days">
        {stats.activityByModule.length === 0 ? (
          <EmptyHint>No module activity yet.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {stats.activityByModule.slice(0, 6).map((item) => (
              <BarRow
                key={item.module}
                label={formatAuditModule(item.module)}
                value={item.count}
                max={moduleMax}
              />
            ))}
          </div>
        )}
      </AuditPanel>

      <AuditPanel title="Activity by User" subtitle="Today">
        {stats.activityByUser.length === 0 ? (
          <EmptyHint>No user activity today.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {stats.activityByUser.slice(0, 6).map((item) => (
              <BarRow key={item.userId} label={item.userName} value={item.count} max={userMax} />
            ))}
          </div>
        )}
      </AuditPanel>

      <AuditPanel title="Activity Timeline" subtitle="Last 7 days">
        {stats.activityTimeline.every((d) => d.count === 0) ? (
          <EmptyHint>No timeline data yet.</EmptyHint>
        ) : (
          <div className="space-y-2">
            {stats.activityTimeline.map((item) => (
              <BarRow
                key={item.date}
                label={format(new Date(item.date), "EEE, MMM d")}
                value={item.count}
                max={timelineMax}
                color="bg-violet-500"
              />
            ))}
          </div>
        )}
      </AuditPanel>

      <AuditPanel title="Recent Changes" subtitle="Latest audit entries">
        {stats.recentChanges.length === 0 ? (
          <EmptyHint>No recent audit entries.</EmptyHint>
        ) : (
          <ul className="divide-y divide-border/70">
            {stats.recentChanges.slice(0, 8).map((item) => (
              <li key={item.id}>
                <Link
                  href={AUDIT_ROUTES.detail(item.id)}
                  className="block rounded-md py-2 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {humanizeActivityDescription(item.description, item.action)}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {formatAuditModule(item.module)} · {item.userName ?? "System"} ·{" "}
                    {format(new Date(item.occurredAt), "MMM d, h:mm a")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AuditPanel>
    </div>
  );
}
