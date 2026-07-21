import { GoalForm, GoalsTable } from "@/components/performance/goals-management";
import { createClient } from "@/lib/supabase/server";
import { canCreatePerformance } from "@/lib/performance/constants";
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

  const [result, lookups, settings] = await Promise.all([
    listGoals(supabase, profile, params),
    getPerformanceLookups(supabase, profile.employee.organizationId),
    getPerformanceSettings(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals & OKRs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a template, assign to an employee, and track progress below.
        </p>
      </div>
      {canCreatePerformance(profile.permissionCodes) ? (
        <GoalForm
          employees={lookups.employees}
          cycles={lookups.cycles}
          categories={settings.settings.goalCategories}
        />
      ) : null}
      <GoalsTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        departments={lookups.departments}
        cycles={lookups.cycles}
        search={params.search}
        employeeId={params.employeeId}
        departmentId={params.departmentId}
        cycleId={params.cycleId}
        goalStatus={params.goalStatus}
      />
    </div>
  );
}
