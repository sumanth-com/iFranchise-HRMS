import { RoleComparison } from "@/components/roles/role-comparison";
import { ROLE_VIEW_PERMISSIONS } from "@/lib/roles/constants";
import { getRoleLookupOptions } from "@/lib/roles/services/role-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function RoleComparePage() {
  const profile = await requireServerAnyPermission([...ROLE_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const roles = await getRoleLookupOptions(supabase, profile.employee.organizationId);

  return (
    <RoleComparison roles={roles} permissionCodes={profile.permissionCodes} />
  );
}
