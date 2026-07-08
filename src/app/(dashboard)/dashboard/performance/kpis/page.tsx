import { KpiTable, KpiWorkflow } from "@/components/performance/kpi-management";
import { createClient } from "@/lib/supabase/server";
import {
  canAssignKpis,
  canManageKpiTemplates,
  canManageKpis,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listKpis,
  listKpiTemplates,
} from "@/lib/performance/services/performance-queries";
import { kpiListParamsSchema } from "@/lib/validations/performance";
import { requireServerPermission } from "@/lib/permissions/server";

type KpisPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KpisPage({ searchParams }: KpisPageProps) {
  const profile = await requireServerPermission("performance.view");
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
    listKpis(supabase, profile, params),
    listKpiTemplates(supabase, profile.employee.organizationId),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  const canManageTemplates = canManageKpiTemplates(profile.permissionCodes);
  const canAssign = canAssignKpis(profile.permissionCodes);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPI Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define KPI templates, assign them to employees, and track completion through review periods.
        </p>
      </div>

      <KpiWorkflow
        departments={lookups.departments}
        designations={lookups.designations}
        employees={lookups.employees}
        templates={templates}
        canManageTemplates={canManageTemplates}
        canAssign={canAssign}
      />

      <KpiTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        departments={lookups.departments}
        designations={lookups.designations}
        search={params.search}
        departmentId={params.departmentId}
        designationId={params.designationId}
        kpiStatus={params.kpiStatus}
        kpiPeriod={params.kpiPeriod}
        canManageKpis={canManageKpis(profile.permissionCodes)}
        currentEmployeeId={profile.employee.id}
      />
    </div>
  );
}
