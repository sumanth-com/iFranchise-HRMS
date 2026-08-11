import { EmployeeKpisView } from "@/components/employee/goals/employee-kpis-view";
import { fetchMyKpisAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function MyKpisPage() {
  await requireServerPermission("performance.view");
  const kpis = await fetchMyKpisAction();

  return <EmployeeKpisView kpis={kpis} />;
}
