"use client";

import { HrTeamNotificationsView } from "@/components/notifications/hr-team-notifications-view";
import { NotificationCenterSplitView } from "@/components/notifications/notification-center-split-view";
import {
  NOTIFICATIONS_ROUTES,
  type NotificationCenterTab,
} from "@/lib/notifications/constants";
import type {
  NotificationDashboardStats,
  NotificationListResult,
} from "@/types/notifications";

type NotificationsSection = "my" | "team";

type Props = {
  initialSection?: NotificationsSection;
  canViewTeam: boolean;
  center: {
    result: NotificationListResult;
    tab: NotificationCenterTab;
    search: string;
    selectedId?: string;
  };
  teamNotifications: NotificationDashboardStats;
};

export function HrNotificationsHubView({
  initialSection = "my",
  canViewTeam,
  center,
  teamNotifications,
}: Props) {
  const section =
    initialSection === "team" && canViewTeam ? "team" : "my";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Read your personal notifications and manage organization-wide alerts.
        </p>
      </div>

      {section === "my" || !canViewTeam ? (
        <NotificationCenterSplitView
          result={center.result}
          tab={center.tab}
          search={center.search}
          selectedId={center.selectedId}
          centerPath={NOTIFICATIONS_ROUTES.dashboard}
          filterParamKey="centerTab"
          preserveQuery={{ tab: "my" }}
          embedded
        />
      ) : (
        <HrTeamNotificationsView stats={teamNotifications} embedded />
      )}
    </div>
  );
}
