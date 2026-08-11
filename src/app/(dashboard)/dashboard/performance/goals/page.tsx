import { GoalsWorkspace } from "@/components/performance/goals-management";
import { createClient } from "@/lib/supabase/server";
import { canCreatePerformance, canEditPerformance } from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listGoals,
} from "@/lib/performance/services/performance-queries";
import { getPerformanceSettings } from "@/lib/performance/services/performance-settings";
import { goalListParamsSchema } from "@/lib/validations/performance";
import { requireServerPermission } from "@/lib/permissions/server";

type GoalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GoalsPage({ searchParams }: GoalsPageProps) {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = goalListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    employeeId: rawParams.employeeId,
    departmentId: rawParams.departmentId,
    cycleId: rawParams.cycleId,
    goalStatus: rawParams.goalStatus,
    goalPriority: rawParams.goalPriority,
  });

  const openGoal =
    typeof rawParams.openGoal === "string" ? rawParams.openGoal : undefined;

  const [result, lookups, settings] = await Promise.all([
    listGoals(supabase, profile, { ...params, assignedByMe: true }),
    getPerformanceLookups(supabase, profile.employee.organizationId),
    getPerformanceSettings(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals & OKRs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign goals on this page and track them in the list below.
        </p>
      </div>

      <GoalsWorkspace
        canCreate={canCreatePerformance(profile.permissionCodes)}
        canManage={
          canEditPerformance(profile.permissionCodes) ||
          canCreatePerformance(profile.permissionCodes)
        }
        formProps={{
          employees: lookups.employees,
          categories: settings.settings.goalCategories,
        }}
        tableProps={{
          records: result.data,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          employees: lookups.employees,
          departments: lookups.departments,
          cycles: lookups.cycles,
          search: params.search,
          employeeId: params.employeeId,
          departmentId: params.departmentId,
          cycleId: params.cycleId,
          goalStatus: params.goalStatus,
          initialGoalId: openGoal,
        }}
      />
    </div>
  );
}
