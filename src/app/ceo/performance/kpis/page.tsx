import { KpiWorkspace } from "@/components/performance/kpi-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listKpis,
  listKpiTemplates,
} from "@/lib/performance/services/performance-queries";
import { createClient } from "@/lib/supabase/server";

export default async function CeoKpisPage() {
  const profile = await requireCeoPortal();
  const supabase = await createClient();

  const [result, templates, lookups] = await Promise.all([
    listKpis(
      supabase,
      { ...profile, permissionCodes: [...profile.permissionCodes, "kpi.manage"] },
      { page: 1, pageSize: PERFORMANCE_CLIENT_FETCH_SIZE },
    ),
    listKpiTemplates(supabase, profile.employee.organizationId),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPI Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review KPI assignments and progress across the organization.
        </p>
      </div>

      <KpiWorkspace
        canAssign={false}
        formProps={{
          employees: lookups.employees,
          templates: templates,
        }}
        tableProps={{
          records: result.data,
          pageSize: PERFORMANCE_TABLE_PAGE_SIZE,
          canManageKpis: false,
          currentEmployeeId: "",
        }}
      />
    </div>
  );
}
