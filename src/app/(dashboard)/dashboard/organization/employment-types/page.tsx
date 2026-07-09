import { EmploymentTypesManagement } from "@/components/organization/employment-types-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { listEmploymentTypes } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmploymentTypesPage() {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const items = await listEmploymentTypes(supabase, profile.employee.organizationId);

  return (
    <EmploymentTypesManagement
      items={items}
      permissionCodes={profile.permissionCodes}
    />
  );
}
