"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
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
  const sectionDefault =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const [section, setSection] = useState<NotificationsSection>(sectionDefault);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Read your personal notifications and manage organization-wide alerts.
          </p>
        </div>
        {canViewTeam ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            <Button
              size="sm"
              variant={section === "my" ? "default" : "ghost"}
              onClick={() => setSection("my")}
            >
              My Notifications
            </Button>
            <Button
              size="sm"
              variant={section === "team" ? "default" : "ghost"}
              onClick={() => setSection("team")}
            >
              Alerts & Broadcasts
            </Button>
          </div>
        ) : null}
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
