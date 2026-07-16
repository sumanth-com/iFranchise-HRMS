"use client";

import { format } from "date-fns";

import { NotificationPriorityBadge } from "@/components/notifications/notification-status-badge";
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
  const groups = alerts.filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Needs Attention</h2>
        <p className="text-xs text-muted-foreground">
          High-signal alerts across payroll, security, and approvals
        </p>
      </div>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.alertType}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {group.label}
              </p>
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                {group.count}
              </span>
            </div>
            <ul className="space-y-1.5">
              {group.items.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left hover:bg-muted/40"
                    onClick={() => onView(item.id)}
                  >
                    <span className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {formatNotificationDisplayText(item.title)}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {format(new Date(item.createdAt), "d MMM HH:mm")}
                      </p>
                    </span>
                    <NotificationPriorityBadge priority={item.priority} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
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
  if (announcements.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Announcements</h2>
        <p className="text-xs text-muted-foreground">
          Company updates and leadership communications
        </p>
      </div>
      <ul className="space-y-2">
        {announcements.slice(0, 5).map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="w-full rounded-lg border px-3 py-2.5 text-left hover:bg-muted/40"
              onClick={() => onView(item.id)}
            >
              <p className="text-sm font-medium">
                {formatNotificationDisplayText(item.title)}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {formatNotificationDisplayText(item.message)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.categoryLabel} ·{" "}
                {format(new Date(item.createdAt), "d MMM yyyy")}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
