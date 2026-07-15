import { NotificationCenterSplitView } from "@/components/notifications/notification-center-split-view";
import { MANAGER_NOTIFICATIONS_ROUTES } from "@/lib/notifications/constants";
import {
  getNotificationById,
  listNotifications,
} from "@/lib/notifications/services/notification-queries";
import type { NotificationCenterTab } from "@/lib/notifications/constants";
import { requireServerPermission } from "@/lib/permissions/server";
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

export default async function ManagerNotificationCenterPage({
  searchParams,
}: Props) {
  const profile = await requireServerPermission("portal.manager.access");
  const supabase = await createClient();
  const params = await searchParams;

  const result = await listNotifications(supabase, profile, {
    tab: (params.tab as NotificationCenterTab) ?? "all",
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Notification Center
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a notification on the left to read details on the right.
        </p>
      </div>
      <NotificationCenterSplitView
        result={{ ...result, items }}
        tab={(params.tab as NotificationCenterTab) ?? "all"}
        search={params.search ?? ""}
        selectedId={params.id}
        centerPath={MANAGER_NOTIFICATIONS_ROUTES.center}
      />
    </div>
  );
}
