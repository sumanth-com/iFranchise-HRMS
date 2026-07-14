import { NotificationCenterSplitView } from "@/components/notifications/notification-center-split-view";
import { listNotifications } from "@/lib/notifications/services/notification-queries";
import type { NotificationCenterTab } from "@/lib/notifications/constants";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
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

export default async function NotificationCenterPage({ searchParams }: Props) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const params = await searchParams;

  const result = await listNotifications(supabase, profile, {
    tab: (params.tab as NotificationCenterTab) ?? "all",
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 20,
    search: params.search,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notification Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a notification on the left to read details on the right.
        </p>
      </div>
      <NotificationCenterSplitView
        result={result}
        tab={(params.tab as NotificationCenterTab) ?? "all"}
        search={params.search ?? ""}
        selectedId={params.id}
      />
    </div>
  );
}
