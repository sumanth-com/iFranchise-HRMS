import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoNotificationKpis } from "@/types/ceo-notifications";

export function CeoNotificationsSummary({ kpis }: { kpis: CeoNotificationKpis }) {
  return (
    <section
      aria-label="Executive notification KPIs"
      className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3"
    >
      <CeoStatCard
        label="Unread"
        value={String(kpis.unread)}
        accent={kpis.unread > 0 ? "text-blue-700 dark:text-blue-400" : undefined}
      />
      <CeoStatCard
        label="High Priority"
        value={String(kpis.highPriority)}
        accent={kpis.highPriority > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard
        label="Pending Approvals"
        value={String(kpis.pendingApprovals)}
        accent={
          kpis.pendingApprovals > 0
            ? "text-amber-700 dark:text-amber-400"
            : undefined
        }
      />
      <CeoStatCard label="System" value={String(kpis.systemAlerts)} />
      <CeoStatCard
        label="Announcements"
        value={String(kpis.companyAnnouncements)}
      />
      <CeoStatCard label="Total" value={String(kpis.totalNotifications)} />
    </section>
  );
}
