import { EmployeeOneOnOnesView } from "@/components/employee/goals/employee-one-on-ones-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { fetchMyOneOnOnesAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function EmployeeOneOnOnesPage() {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.employee]);
  const { meetings, viewerEmployeeId } = await fetchMyOneOnOnesAction();

  return (
    <EmployeeOneOnOnesView meetings={meetings} viewerEmployeeId={viewerEmployeeId} />
  );
}
