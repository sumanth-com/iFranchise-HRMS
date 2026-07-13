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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Centralized audit trail for every important action across the HRMS.
        </p>
      </div>
      <AuditSummaryCards stats={stats} />
      <AuditDashboardPanels stats={stats} />
    </div>
  );
}
