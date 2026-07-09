import { NotificationHistoryPanel } from "@/components/notifications/notification-history-panel";
import { canManageNotifications } from "@/lib/notifications/constants";
import { listNotificationHistory } from "@/lib/notifications/services/notification-queries";
import { getEmployeeLookups } from "@/lib/employees/services/employee-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationHistoryParams } from "@/types/notifications";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function NotificationHistoryPage({ searchParams }: Props) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const params = await searchParams;
  const isAdmin = canManageNotifications(profile.permissionCodes);

  const historyParams: NotificationHistoryParams = {
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 20,
    employeeId: params.employeeId,
    module: params.module as NotificationHistoryParams["module"],
    type: params.type,
    priority: params.priority as NotificationHistoryParams["priority"],
    status: params.status as NotificationHistoryParams["status"],
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    search: params.search,
  };

  const [result, lookups] = await Promise.all([
    listNotificationHistory(supabase, profile, historyParams),
    isAdmin ? getEmployeeLookups(supabase, profile.employee.organizationId) : Promise.resolve(null),
  ]);

  const employees = lookups?.managers ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notification History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete audit trail of notifications with advanced filters.
        </p>
      </div>
      <NotificationHistoryPanel
        result={result}
        employees={employees}
        showRecipient={isAdmin}
        filters={{
          employeeId: params.employeeId,
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
