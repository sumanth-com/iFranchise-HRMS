"use client";

import { CeoStatCard } from "@/components/ceo/ceo-module-primitives";
import type { CeoNotificationKpis } from "@/types/ceo-notifications";

export function CeoNotificationsSummary({ kpis }: { kpis: CeoNotificationKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CeoStatCard label="Total Notifications" value={String(kpis.totalNotifications)} />
      <CeoStatCard label="Unread" value={String(kpis.unread)} accent="text-blue-700" />
      <CeoStatCard
        label="High Priority"
        value={String(kpis.highPriority)}
        accent="text-orange-700"
      />
      <CeoStatCard
        label="Pending Approvals"
        value={String(kpis.pendingApprovals)}
        accent="text-amber-700"
      />
      <CeoStatCard label="System Alerts" value={String(kpis.systemAlerts)} />
      <CeoStatCard
        label="Company Announcements"
        value={String(kpis.companyAnnouncements)}
      />
      <CeoStatCard label="Recruitment Alerts" value={String(kpis.recruitmentAlerts)} />
      <CeoStatCard label="Payroll Alerts" value={String(kpis.payrollAlerts)} />
    </div>
  );
}
