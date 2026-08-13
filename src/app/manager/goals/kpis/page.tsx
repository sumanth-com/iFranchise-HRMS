import { EmployeeKpisView } from "@/components/employee/goals/employee-kpis-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { fetchMyKpisAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function ManagerKpisPage() {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.manager, "performance.view"]);
  const kpis = await fetchMyKpisAction();

  return <EmployeeKpisView kpis={kpis} />;
}
