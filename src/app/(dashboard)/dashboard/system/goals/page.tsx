import { EmployeeGoalsView } from "@/components/employee/goals/employee-goals-view";
import { fetchMyGoalsAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SuperAdminGoalsPage() {
  await requireSuperAdminProfile();
  const goals = await fetchMyGoalsAction();

  return <EmployeeGoalsView goals={goals} />;
}
