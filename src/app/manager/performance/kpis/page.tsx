import { KpiWorkspace } from "@/components/performance/kpi-management";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import {
  listKpis,
  listKpiTemplates,
} from "@/lib/performance/services/performance-queries";
import { kpiListParamsSchema } from "@/lib/validations/performance";

type KpisPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerKpisPage({ searchParams }: KpisPageProps) {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();
  const rawParams = await searchParams;

  const params = kpiListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    departmentId: rawParams.departmentId,
    designationId: rawParams.designationId,
    kpiStatus: rawParams.kpiStatus,
    kpiPeriod: rawParams.kpiPeriod,
  });

  const [result, templates] = await Promise.all([
    listKpis(supabase, profile, params),
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
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          departments: lookups.departments,
          designations: lookups.designations,
          search: params.search,
          departmentId: params.departmentId,
          designationId: params.designationId,
          kpiStatus: params.kpiStatus,
          kpiPeriod: params.kpiPeriod,
          canManageKpis: true,
          currentEmployeeId: profile.employee.id,
        }}
      />
    </div>
  );
}
