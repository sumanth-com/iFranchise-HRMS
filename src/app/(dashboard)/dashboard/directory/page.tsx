import { EmployeeDirectoryView } from "@/components/employee/directory/employee-directory-view";
import { PageScroll } from "@/components/common/sticky-layout";
import { listEmployeeDirectory } from "@/lib/employee/services/employee-directory-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function DirectorySelfServicePage() {
  const profile = await requireServerPermission("employee.view");
  const supabase = await createClient();
  const people = await listEmployeeDirectory(supabase, profile);

  return (
    <PageScroll>
      <EmployeeDirectoryView people={people} />
    </PageScroll>
  );
}
