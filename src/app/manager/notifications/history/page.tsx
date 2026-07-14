import { NotificationHistoryPanel } from "@/components/notifications/notification-history-panel";
import {
  MANAGER_NOTIFICATIONS_ROUTES,
} from "@/lib/notifications/constants";
import { listNotificationHistory } from "@/lib/notifications/services/notification-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationHistoryParams } from "@/types/notifications";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ManagerNotificationHistoryPage({ searchParams }: Props) {
  const profile = await requireServerPermission("portal.manager.access");
  const supabase = await createClient();
  const params = await searchParams;

  const historyParams: NotificationHistoryParams = {
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 20,
    module: params.module as NotificationHistoryParams["module"],
    type: params.type,
    priority: params.priority as NotificationHistoryParams["priority"],
    status: params.status as NotificationHistoryParams["status"],
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    search: params.search,
  };

  const result = await listNotificationHistory(supabase, profile, historyParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notification History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chronological log of past notifications grouped by date.
        </p>
      </div>
      <NotificationHistoryPanel
        result={result}
        employees={[]}
        showRecipient={false}
        historyPath={MANAGER_NOTIFICATIONS_ROUTES.history}
        filters={{
          module: params.module,
          type: params.type,
          priority: params.priority,
          status: params.status,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          search: params.search,
        }}
      />
    </div>
  );
}
