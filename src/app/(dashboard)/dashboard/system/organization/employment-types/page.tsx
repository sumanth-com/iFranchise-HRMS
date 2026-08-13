import { EmploymentTypesManagement } from "@/components/organization/employment-types-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { listEmploymentTypes } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminEmploymentTypesPage() {
  await requireSuperAdminProfile();
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const items = await listEmploymentTypes(
    supabase,
    profile.employee.organizationId,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employment Types</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master employment classifications used by employee records and payroll.
        </p>
      </div>
      <EmploymentTypesManagement
        items={items}
        permissionCodes={profile.permissionCodes}
      />
    </div>
  );
}
