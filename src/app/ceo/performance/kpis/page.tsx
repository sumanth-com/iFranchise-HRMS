import { KpiWorkspace } from "@/components/performance/kpi-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  getPerformanceLookups,
  listKpis,
  listKpiTemplates,
} from "@/lib/performance/services/performance-queries";
import { createClient } from "@/lib/supabase/server";
import { kpiListParamsSchema } from "@/lib/validations/performance";

type KpisPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoKpisPage({ searchParams }: KpisPageProps) {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
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

  const [result, templates, lookups] = await Promise.all([
    listKpis(
      supabase,
      { ...profile, permissionCodes: [...profile.permissionCodes, "kpi.manage"] },
      params,
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
          canManageKpis: false,
          currentEmployeeId: "",
        }}
      />
    </div>
  );
}
