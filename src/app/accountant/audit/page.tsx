import { AuditDashboardPanels } from "@/components/audit/audit-dashboard-panels";
import { AuditSummaryCards } from "@/components/audit/audit-summary-cards";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { AUDIT_VIEW_PERMISSIONS } from "@/lib/audit/constants";
import { getAuditDashboardStats } from "@/lib/audit/services/audit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AccountantAuditDashboardPage() {
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const stats = await getAuditDashboardStats(supabase, profile);

  return (
    <div className="flex min-h-[calc(100dvh-13.5rem)] flex-col gap-3 overflow-hidden lg:min-h-[calc(100dvh-12.5rem)]">
      <header className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Payroll Audit</h1>
        <p className="text-xs text-muted-foreground">
          Read-only payroll audit history — who created, updated, approved, or released payroll
          records.
        </p>
      </header>

      <AuditSummaryCards stats={stats} />
      <AuditDashboardPanels stats={stats} routesBasePath={ACCOUNTANT_ROUTES.audit} />
    </div>
  );
}
