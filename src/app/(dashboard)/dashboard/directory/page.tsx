import { EmployeeDirectoryView } from "@/components/employee/directory/employee-directory-view";
import { PageScroll } from "@/components/common/sticky-layout";
import { listEmployeeDirectory } from "@/lib/employee/services/employee-directory-queries";
import { getDepartments } from "@/lib/organization/services/org-lookups";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function DirectorySelfServicePage() {
  const profile = await requireServerPermission("employee.directory.view");
  const supabase = await createClient();
  const [people, departments] = await Promise.all([
    listEmployeeDirectory(supabase, profile),
    getDepartments(supabase, profile.employee.organizationId),
  ]);

  return (
    <PageScroll>
      <EmployeeDirectoryView people={people} departments={departments} />
    </PageScroll>
  );
}
