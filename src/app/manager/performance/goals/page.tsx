import { GoalsWorkspace } from "@/components/performance/goals-management";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import { listGoals } from "@/lib/performance/services/performance-queries";
import { getPerformanceSettings } from "@/lib/performance/services/performance-settings";

type GoalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerGoalsPage({ searchParams }: GoalsPageProps) {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();
  const rawParams = await searchParams;

  const openGoal =
    typeof rawParams.openGoal === "string" ? rawParams.openGoal : undefined;

  const [result, settings] = await Promise.all([
    listGoals(supabase, profile, {
      page: 1,
      pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
    }),
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
          pageSize: PERFORMANCE_TABLE_PAGE_SIZE,
          employees: lookups.employees,
          initialGoalId: openGoal,
        }}
      />
    </div>
  );
}
