import { EmployeeGoalsView } from "@/components/employee/goals/employee-goals-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { fetchMyGoalsAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function ManagerGoalsPage() {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.manager, "performance.view"]);
  const goals = await fetchMyGoalsAction();

  return <EmployeeGoalsView goals={goals} />;
}
