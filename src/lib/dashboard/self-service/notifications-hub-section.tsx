import { Suspense } from "react";

import { HrNotificationsHubView } from "@/components/notifications/hr-notifications-hub-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { NotificationCenterTab } from "@/lib/notifications/constants";
import { canManageNotifications } from "@/lib/notifications/constants";
import { firstHubSearchParam } from "@/lib/dashboard/hub-page-utils";
import {
  getNotificationDashboardStats,
  listNotifications,
} from "@/lib/notifications/services/notification-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

function firstString(value: string | string[] | undefined) {
  return firstHubSearchParam(value);
}

export async function NotificationsHubSection({
  section,
  searchParams,
}: {
  section: "my" | "team";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const raw = await searchParams;
  const canViewTeam = canManageNotifications(profile.permissionCodes);

  const centerTab = (firstString(raw.centerTab) as NotificationCenterTab) ?? "all";

  const [centerResult, teamStats] = await Promise.all([
    listNotifications(supabase, profile, {
      tab: centerTab,
      page: raw.page ? Number(raw.page) : 1,
      pageSize: raw.pageSize ? Number(raw.pageSize) : 20,
      search: firstString(raw.search),
    }),
    canViewTeam ? getNotificationDashboardStats(supabase, profile) : Promise.resolve(null),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <HrNotificationsHubView
        initialSection={section}
        canViewTeam={canViewTeam}
        center={{
          result: centerResult,
          tab: centerTab,
          search: firstString(raw.search) ?? "",
          selectedId: firstString(raw.id),
        }}
        teamNotifications={
          teamStats ?? {
            unread: 0,
            todayCount: 0,
            criticalAlerts: 0,
            failedDeliveries: 0,
            emailQueue: 0,
            recentCritical: [],
          }
        }
      />
    </Suspense>
  );
}
