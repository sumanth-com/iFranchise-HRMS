import { AuditDashboardPanels } from "@/components/audit/audit-dashboard-panels";
import { AuditSummaryCards } from "@/components/audit/audit-summary-cards";
import { getAuditDashboardStats } from "@/lib/audit/services/audit-queries";
import { AUDIT_VIEW_PERMISSIONS } from "@/lib/audit/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AuditDashboardPage() {
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const stats = await getAuditDashboardStats(supabase, profile);

  return (
    <div className="flex min-h-[calc(100dvh-13.5rem)] flex-col gap-3 overflow-hidden lg:min-h-[calc(100dvh-12.5rem)]">
      <header className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Audit Trail</h1>
        <p className="text-xs text-muted-foreground">
          Centralized audit trail for every important action across the HRMS.
        </p>
      </header>

      <AuditSummaryCards stats={stats} />
      <AuditDashboardPanels stats={stats} />
    </div>
  );
}
