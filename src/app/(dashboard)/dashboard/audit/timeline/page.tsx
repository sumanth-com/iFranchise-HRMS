import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { AUDIT_ROUTES, AUDIT_VIEW_PERMISSIONS } from "@/lib/audit/constants";
import { listAuditLogs } from "@/lib/audit/services/audit-queries";
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

  const listParams: AuditListParams = {
    page: 1,
    pageSize: 50,
    search: params.search,
    module: params.module,
    action: params.action,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const result = await listAuditLogs(supabase, profile, listParams);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chronological view of audit events across the organization.
        </p>
      </div>
      <AuditFilters filters={params} basePath={AUDIT_ROUTES.timeline} />
      <AuditTimeline items={result.items} />
    </div>
  );
}
