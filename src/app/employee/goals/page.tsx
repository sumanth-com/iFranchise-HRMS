import { EmployeeGoalsView } from "@/components/employee/goals/employee-goals-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { fetchMyGoalsAction } from "@/lib/employee/actions/employee-goals-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function EmployeeGoalsPage() {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.employee]);
  const goals = await fetchMyGoalsAction();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Goals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Goals assigned to you by HR or your manager. Open a goal to review details and
            update key results.
          </p>
        </div>
        <EmployeeGoalsView goals={goals} />
      </div>
    </div>
  );
}
