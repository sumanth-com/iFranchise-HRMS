import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditLogsTable } from "@/components/audit/audit-logs-table";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { AUDIT_VIEW_PERMISSIONS, canExportAudit } from "@/lib/audit/constants";
import { listAuditLogs } from "@/lib/audit/services/audit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { AuditListParams } from "@/lib/validations/audit";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AccountantAuditLogsPage({ searchParams }: Props) {
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const params = await searchParams;

  const listParams: AuditListParams = {
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 20,
    search: params.search,
    module: params.module ?? "payroll",
    action: params.action,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const result = await listAuditLogs(supabase, profile, listParams);

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search and filter payroll-related audit history. Export requires audit.export.
        </p>
      </div>
      <AuditFilters filters={params} basePath={ACCOUNTANT_ROUTES.auditLogs} />
      <AuditLogsTable
        result={result}
        canExport={canExportAudit(profile.permissionCodes)}
        filters={{ ...params, module: params.module ?? "payroll" }}
        routesBasePath={ACCOUNTANT_ROUTES.audit}
      />
    </div>
  );
}
