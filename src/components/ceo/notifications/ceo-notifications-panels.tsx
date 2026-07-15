"use client";

import { format } from "date-fns";

import {
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-status-badge";
import { formatNotificationDisplayText } from "@/lib/notifications/constants";
import type {
  CeoNotificationAlertGroup,
  CeoNotificationAnnouncementItem,
} from "@/types/ceo-notifications";

export function CeoNotificationsAlerts({
  alerts,
  onView,
}: {
  alerts: CeoNotificationAlertGroup[];
  onView: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Executive Alerts</h2>
        <p className="text-xs text-muted-foreground">
          Critical system, payroll, attrition, security and approval signals.
        </p>
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active executive alerts.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {alerts.map((group) => (
            <div key={group.alertType} className="rounded-lg border px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{group.label}</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  {group.count}
                </span>
              </div>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => onView(item.id)}
                    >
                      <p className="text-sm font-medium text-primary hover:underline">
                        {formatNotificationDisplayText(item.title)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <NotificationPriorityBadge priority={item.priority} />
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(item.createdAt), "dd MMM HH:mm")}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function CeoNotificationsAnnouncements({
  announcements,
  onView,
}: {
  announcements: CeoNotificationAnnouncementItem[];
  onView: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Announcements</h2>
        <p className="text-xs text-muted-foreground">
          Company announcements, board meetings, policy updates and events.
        </p>
      </div>
      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ul className="space-y-3">
          {announcements.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <button type="button" className="min-w-0 text-left" onClick={() => onView(item.id)}>
                <p className="text-sm font-medium text-primary hover:underline">
                  {formatNotificationDisplayText(item.title)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {formatNotificationDisplayText(item.message)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.categoryLabel} ·{" "}
                  {format(new Date(item.createdAt), "dd MMM yyyy HH:mm")}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <NotificationPriorityBadge priority={item.priority} />
                <NotificationStatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
