import { ShiftTemplatesManagement } from "@/components/organization/shift-templates-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { listShiftTemplates } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ShiftTemplatesPage() {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const items = await listShiftTemplates(supabase, profile.employee.organizationId);

  return (
    <ShiftTemplatesManagement
      items={items}
      permissionCodes={profile.permissionCodes}
    />
  );
}
