import { EmployeeHelpView } from "@/components/employee/help/employee-help-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function EmployeeHelpPage() {
  const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.employee]);

  return <EmployeeHelpView firstName={profile.employee.firstName} />;
}
