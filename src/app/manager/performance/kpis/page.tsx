import { KpiWorkspace } from "@/components/performance/kpi-management";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import {
  listKpis,
  listKpiTemplates,
} from "@/lib/performance/services/performance-queries";

export default async function ManagerKpisPage() {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();

  const [result, templates] = await Promise.all([
    listKpis(supabase, profile, {
      page: 1,
      pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
    }),
    listKpiTemplates(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPI Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign templates and track KPI progress for your team.
        </p>
      </div>

      <KpiWorkspace
        canAssign
        listBasePath={MANAGER_ROUTES.performanceKpis}
        formProps={{
          employees: lookups.employees,
          templates,
        }}
        tableProps={{
          records: result.data,
          pageSize: PERFORMANCE_TABLE_PAGE_SIZE,
          canManageKpis: true,
          currentEmployeeId: profile.employee.id,
        }}
      />
    </div>
  );
}
