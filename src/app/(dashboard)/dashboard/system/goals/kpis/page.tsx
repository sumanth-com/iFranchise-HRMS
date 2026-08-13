import { EmployeeKpisView } from "@/components/employee/goals/employee-kpis-view";
import { fetchMyKpisAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SuperAdminKpisPage() {
  await requireSuperAdminProfile();
  const kpis = await fetchMyKpisAction();

  return <EmployeeKpisView kpis={kpis} />;
}
