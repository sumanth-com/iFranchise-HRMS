import { EmployeeDirectoryView } from "@/components/employee/directory/employee-directory-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { listEmployeeDirectory } from "@/lib/employee/services/employee-directory-queries";
import { getDepartments } from "@/lib/organization/services/org-lookups";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeDirectoryPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee.directory.view",
  ]);
  const supabase = await createClient();
  const [people, departments] = await Promise.all([
    listEmployeeDirectory(supabase, profile),
    getDepartments(supabase, profile.employee.organizationId),
  ]);

  return <EmployeeDirectoryView people={people} departments={departments} />;
}
