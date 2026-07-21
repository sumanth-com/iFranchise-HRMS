"use client";

import { NotificationsSummaryCards } from "@/components/notifications/notifications-summary-cards";
import { NotificationPriorityBadge } from "@/components/notifications/notification-status-badge";
import { formatNotificationModule } from "@/lib/notifications/constants";
import type { NotificationDashboardStats } from "@/types/notifications";

type HrTeamNotificationsViewProps = {
  stats: NotificationDashboardStats;
  embedded?: boolean;
};

export function HrTeamNotificationsView({
  stats,
  embedded = false,
}: HrTeamNotificationsViewProps) {
  return (
    <div className="space-y-6">
      <div>
        {embedded ? (
          <h2 className="text-lg font-semibold tracking-tight">Alerts & Broadcasts</h2>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">Alerts & Broadcasts</h1>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Centralized notification center for alerts across every HRMS module.
        </p>
      </div>
      <NotificationsSummaryCards stats={stats} />
      {stats.recentCritical.length > 0 ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold">Critical Alerts</h3>
          <ul className="mt-3 space-y-3">
            {stats.recentCritical.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNotificationModule(item.module)}
                  </p>
                </div>
                <NotificationPriorityBadge priority={item.priority} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
