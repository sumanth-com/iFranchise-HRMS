import { EmployeeDirectoryView } from "@/components/employee/directory/employee-directory-view";
import { listEmployeeDirectory } from "@/lib/employee/services/employee-directory-queries";
import { getDepartments } from "@/lib/organization/services/org-lookups";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/auth";

export async function EmployeeDirectoryScreen({
  profile,
  stickyToolbar = true,
}: {
  profile: UserProfile;
  stickyToolbar?: boolean;
}) {
  const supabase = await createClient();
  const [people, departments] = await Promise.all([
    listEmployeeDirectory(supabase, profile, { employeePortalListing: true }),
    getDepartments(supabase, profile.employee.organizationId),
  ]);

  return (
    <EmployeeDirectoryView
      people={people}
      departments={departments}
      stickyToolbar={stickyToolbar}
    />
  );
}
