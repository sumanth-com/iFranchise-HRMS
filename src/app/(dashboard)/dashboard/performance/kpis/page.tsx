import { KpiWorkspace } from "@/components/performance/kpi-management";
import { createClient } from "@/lib/supabase/server";
import {
  canAssignKpis,
  canManageKpis,
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listKpis,
  listKpiTemplates,
} from "@/lib/performance/services/performance-queries";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function KpisPage() {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();

  const [result, templates, lookups] = await Promise.all([
    listKpis(supabase, profile, {
      page: 1,
      pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
    }),
    listKpiTemplates(supabase, profile.employee.organizationId),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  const canAssign = canAssignKpis(profile.permissionCodes);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPI Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a template, assign to an employee, and track progress below.
        </p>
      </div>

      <KpiWorkspace
        canAssign={canAssign}
        formProps={{
          employees: lookups.employees,
          templates: templates,
        }}
        tableProps={{
          records: result.data,
          pageSize: PERFORMANCE_TABLE_PAGE_SIZE,
          canManageKpis: canManageKpis(profile.permissionCodes),
          currentEmployeeId: profile.employee.id,
        }}
      />
    </div>
  );
}
