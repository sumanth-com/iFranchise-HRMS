import { EmployeeDirectoryScreen } from "@/components/employee/directory/employee-directory-screen";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function AccountantEmployeeDirectoryPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.accountant,
    "employee.directory.view",
  ]);

  return <EmployeeDirectoryScreen profile={profile} stickyToolbar />;
}
