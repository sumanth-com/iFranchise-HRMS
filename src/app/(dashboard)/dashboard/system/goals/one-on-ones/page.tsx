import { EmployeeOneOnOnesView } from "@/components/employee/goals/employee-one-on-ones-view";
import { fetchMyOneOnOnesAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SuperAdminOneOnOnesPage() {
  await requireSuperAdminProfile();
  const { meetings, viewerEmployeeId } = await fetchMyOneOnOnesAction();

  return (
    <EmployeeOneOnOnesView meetings={meetings} viewerEmployeeId={viewerEmployeeId} />
  );
}
