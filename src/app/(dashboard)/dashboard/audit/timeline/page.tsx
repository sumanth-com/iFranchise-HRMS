import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { AUDIT_ROUTES, AUDIT_VIEW_PERMISSIONS } from "@/lib/audit/constants";
import {
  listAuditLogs,
  listAuditRoles,
  listAuditUsers,
} from "@/lib/audit/services/audit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { AuditListParams } from "@/lib/validations/audit";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AuditTimelinePage({ searchParams }: Props) {
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const params = await searchParams;
  const organizationId = profile.employee.organizationId;

  const listParams: AuditListParams = {
    page: 1,
    pageSize: 50,
    search: params.search,
    userId: params.userId,
    roleId: params.roleId,
    module: params.module,
    action: params.action,
    status: params.status as AuditListParams["status"],
    priority: params.priority as AuditListParams["priority"],
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const [result, users, roles] = await Promise.all([
    listAuditLogs(supabase, profile, listParams),
    listAuditUsers(supabase, organizationId),
    listAuditRoles(supabase, organizationId),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chronological view of audit events across the organization.
        </p>
      </div>
      <AuditFilters users={users} roles={roles} filters={params} basePath={AUDIT_ROUTES.timeline} />
      <AuditTimeline items={result.items} />
    </div>
  );
}
