import { EmployeeDirectoryView } from "@/components/employee/directory/employee-directory-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { listEmployeeDirectory } from "@/lib/employee/services/employee-directory-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeDirectoryPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee.view",
  ]);
  const supabase = await createClient();
  const people = await listEmployeeDirectory(supabase, profile);

  return <EmployeeDirectoryView people={people} />;
}
