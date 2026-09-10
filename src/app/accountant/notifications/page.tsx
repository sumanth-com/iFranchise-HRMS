import { NotificationCenterSplitView } from "@/components/notifications/notification-center-split-view";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import type { NotificationCenterTab } from "@/lib/notifications/constants";
import {
  getNotificationById,
  listNotifications,
} from "@/lib/notifications/services/notification-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    id?: string;
  }>;
};

export default async function AccountantNotificationsPage({ searchParams }: Props) {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.accountant,
    "notification.view",
  ]);
  const supabase = await createClient();
  const params = await searchParams;

  const tab = (params.tab as NotificationCenterTab) ?? "all";
  const result = await listNotifications(supabase, profile, {
    tab,
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 20,
    search: params.search,
  });

  let items = result.items;
  if (params.id && !items.some((item) => item.id === params.id)) {
    const selected = await getNotificationById(supabase, profile, params.id);
    if (selected) items = [selected, ...items];
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a notification on the left to read its details.
        </p>
      </div>
      <NotificationCenterSplitView
        result={{ ...result, items }}
        tab={tab}
        search={params.search ?? ""}
        selectedId={params.id}
        centerPath={ACCOUNTANT_ROUTES.notifications}
      />
    </div>
  );
}
