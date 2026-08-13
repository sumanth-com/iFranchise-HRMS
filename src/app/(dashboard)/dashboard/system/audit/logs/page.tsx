import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditLogsTable } from "@/components/audit/audit-logs-table";
import { AuditSummaryCards } from "@/components/audit/audit-summary-cards";
import { ErrorState } from "@/components/common/error-state";
import {
  AUDIT_VIEW_PERMISSIONS,
  canExportAudit,
  resolveAuditRoutes,
} from "@/lib/audit/constants";
import {
  getAuditSummaryCardStats,
  listAuditLogs,
} from "@/lib/audit/services/audit-queries";
import { safeServerCallWithError } from "@/lib/errors/safe-server";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { createClient } from "@/lib/supabase/server";
import type { AuditListParams } from "@/lib/validations/audit";
import type { AuditDashboardStats } from "@/types/audit";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const EMPTY_SUMMARY: Pick<
  AuditDashboardStats,
  "totalToday" | "criticalActions" | "failedActions" | "loginEvents"
> = {
  totalToday: 0,
  criticalActions: 0,
  failedActions: 0,
  loginEvents: 0,
};

export default async function SuperAdminAuditLogsPage({ searchParams }: Props) {
  await requireSuperAdminProfile();
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const params = await searchParams;
  const routes = resolveAuditRoutes(SYSTEM_ADMIN_ROUTES.audit);

  const listParams: AuditListParams = {
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 20,
    search: params.search,
    module: params.module,
    action: params.action,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const [{ data: result, error }, { data: summary }] = await Promise.all([
    safeServerCallWithError(
      () => listAuditLogs(supabase, profile, listParams),
      {
        items: [],
        total: 0,
        page: listParams.page ?? 1,
        pageSize: listParams.pageSize ?? 20,
      },
      "[system/audit/logs] listAuditLogs",
    ),
    safeServerCallWithError(
      () => getAuditSummaryCardStats(supabase, profile),
      EMPTY_SUMMARY,
      "[system/audit/logs] getAuditSummaryCardStats",
    ),
  ]);

  const cardStats: AuditDashboardStats = {
    ...EMPTY_SUMMARY,
    ...summary,
    recentChanges: [],
    topActiveUsers: [],
    activityByModule: [],
    activityTimeline: [],
    activityByUser: [],
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">
          Search, review, and export audit entries. Soft-delete is available for Super Admin.
        </p>
      </header>

      <AuditSummaryCards stats={cardStats} />

      <AuditFilters filters={params} basePath={routes.logs} />
      {error ? (
        <ErrorState
          title="Unable to load audit logs"
          description="The audit query took too long. Try narrowing the date range or filters, then retry."
        />
      ) : (
        <AuditLogsTable
          result={result}
          canExport={canExportAudit(profile.permissionCodes)}
          filters={params}
          routesBasePath={SYSTEM_ADMIN_ROUTES.audit}
          canDelete
        />
      )}
    </div>
  );
}
