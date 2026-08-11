import { EmployeeGoalsView } from "@/components/employee/goals/employee-goals-view";
import { fetchMyGoalsAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function MyGoalsPage() {
  await requireServerPermission("performance.view");
  const goals = await fetchMyGoalsAction();

  return <EmployeeGoalsView goals={goals} />;
}
