import { AlertTriangle, Bell, Inbox, Mail, MailWarning } from "lucide-react";

import type { NotificationDashboardStats } from "@/types/notifications";

const CARDS = [
  {
    key: "unread" as const,
    label: "Unread",
    icon: Bell,
    accent: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  {
    key: "todayCount" as const,
    label: "Today's Notifications",
    icon: Inbox,
    accent: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  {
    key: "criticalAlerts" as const,
    label: "Critical Alerts",
    icon: AlertTriangle,
    accent: "text-red-600",
    bg: "bg-red-500/10",
  },
  {
    key: "failedDeliveries" as const,
    label: "Failed Deliveries",
    icon: MailWarning,
    accent: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  {
    key: "emailQueue" as const,
    label: "Email Queue",
    icon: Mail,
    accent: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
];

export function NotificationsSummaryCards({ stats }: { stats: NotificationDashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{stats[card.key]}</p>
              </div>
              <div className={`rounded-lg p-2 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.accent}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
