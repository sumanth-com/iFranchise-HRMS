import { GoalsWorkspace } from "@/components/performance/goals-management";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import { listGoals } from "@/lib/performance/services/performance-queries";
import { getPerformanceSettings } from "@/lib/performance/services/performance-settings";
import { goalListParamsSchema } from "@/lib/validations/performance";

type GoalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerGoalsPage({ searchParams }: GoalsPageProps) {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();
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

  const [result, settings] = await Promise.all([
    listGoals(supabase, profile, params),
    getPerformanceSettings(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals & OKRs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign and track goals for people in your reporting hierarchy.
        </p>
      </div>

      <GoalsWorkspace
        canCreate
        canManage
        listBasePath={MANAGER_ROUTES.performanceGoals}
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
