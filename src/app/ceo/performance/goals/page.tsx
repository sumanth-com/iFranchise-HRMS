import { GoalsWorkspace } from "@/components/performance/goals-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listGoals,
} from "@/lib/performance/services/performance-queries";
import { getPerformanceSettings } from "@/lib/performance/services/performance-settings";
import { createClient } from "@/lib/supabase/server";

type GoalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoGoalsPage({ searchParams }: GoalsPageProps) {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const rawParams = await searchParams;

  const openGoal =
    typeof rawParams.openGoal === "string" ? rawParams.openGoal : undefined;

  const [result, lookups, settings] = await Promise.all([
    listGoals(supabase, profile, {
      page: 1,
      pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
    }),
    getPerformanceLookups(supabase, profile.employee.organizationId),
    getPerformanceSettings(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals & OKRs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View assigned goals and progress across the organization.
        </p>
      </div>

      <GoalsWorkspace
        canCreate={false}
        canManage={false}
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
