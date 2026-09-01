import { EmployeeDirectoryScreen } from "@/components/employee/directory/employee-directory-screen";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function HrEmployeeDirectoryPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.hr,
    "employee.directory.view",
  ]);

  return <EmployeeDirectoryScreen profile={profile} stickyToolbar />;
}
