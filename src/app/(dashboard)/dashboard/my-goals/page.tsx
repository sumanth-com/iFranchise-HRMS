import { EmployeeGoalsView } from "@/components/employee/goals/employee-goals-view";
import { fetchMyGoalsAction } from "@/lib/employee/actions/employee-goals-actions";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function MyGoalsPage() {
  await requireServerPermission("performance.view");
  const goals = await fetchMyGoalsAction();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Goals assigned to you. Open a goal to review details and update key results.
        </p>
      </div>
      <EmployeeGoalsView goals={goals} />
    </div>
  );
}
