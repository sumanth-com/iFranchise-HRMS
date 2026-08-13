import { HierarchyManagement } from "@/components/organization/hierarchy-management";
import {
  requireCeoPortal,
  toViewOnlyPermissionCodes,
} from "@/lib/ceo/read-only-permissions";
import {
  buildHierarchyTree,
  listHierarchyEmployees,
} from "@/lib/organization/services/org-queries";
import { createClient } from "@/lib/supabase/server";

export default async function CeoHierarchyPage() {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const employees = await listHierarchyEmployees(supabase, profile.employee.organizationId);
  const tree = buildHierarchyTree(employees);

  return (
    <HierarchyManagement
      tree={tree}
      employees={employees}
      permissionCodes={toViewOnlyPermissionCodes(profile.permissionCodes)}
    />
  );
}
