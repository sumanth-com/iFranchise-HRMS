import { NotificationCenterSplitView } from "@/components/notifications/notification-center-split-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import type { NotificationCenterTab } from "@/lib/notifications/constants";
import {
  getNotificationById,
  listNotifications,
} from "@/lib/notifications/services/notification-queries";
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

export default async function CeoNotificationsPage({ searchParams }: Props) {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
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
          Your personal alerts for attendance, leave, payroll, and other updates.
        </p>
      </div>
      <NotificationCenterSplitView
        result={{ ...result, items }}
        tab={tab}
        search={params.search ?? ""}
        selectedId={params.id}
        centerPath={CEO_ROUTES.notifications}
      />
    </div>
  );
}
