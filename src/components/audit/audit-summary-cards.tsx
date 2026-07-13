import { Activity, AlertTriangle, LogIn, ShieldAlert } from "lucide-react";

import type { AuditDashboardStats } from "@/types/audit";

const CARDS = [
  { key: "totalToday" as const, label: "Total Activities Today", icon: Activity, accent: "text-blue-600", bg: "bg-blue-500/10" },
  { key: "criticalActions" as const, label: "Critical Actions", icon: ShieldAlert, accent: "text-red-600", bg: "bg-red-500/10" },
  { key: "failedActions" as const, label: "Failed Actions", icon: AlertTriangle, accent: "text-amber-600", bg: "bg-amber-500/10" },
  { key: "loginEvents" as const, label: "Login Events", icon: LogIn, accent: "text-violet-600", bg: "bg-violet-500/10" },
];

export function AuditSummaryCards({ stats }: { stats: AuditDashboardStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{stats[card.key]}</p>
              </div>
              <div className={`rounded-lg p-1.5 ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
      <div className="rounded-xl border bg-card p-3 shadow-sm sm:col-span-2 xl:col-span-4">
        <div className="text-sm font-semibold">Top Active Users Today</div>
        {stats.topActiveUsers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No activity recorded today.</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {stats.topActiveUsers.slice(0, 5).map((user) => (
              <li key={user.userId} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{user.userName}</p>
                <p className="text-muted-foreground">{user.count} actions</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
