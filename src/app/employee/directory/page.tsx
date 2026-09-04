import { EmployeeDirectoryScreen } from "@/components/employee/directory/employee-directory-screen";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function EmployeeDirectoryPage() {
  const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.employee]);

  return <EmployeeDirectoryScreen profile={profile} stickyToolbar />;
}
