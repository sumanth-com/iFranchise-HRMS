import { HierarchyManagement } from "@/components/organization/hierarchy-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import {
  buildHierarchyTree,
  listHierarchyEmployees,
} from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function HierarchyPage() {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const employees = await listHierarchyEmployees(supabase, profile.employee.organizationId);
  const tree = buildHierarchyTree(employees);

  return (
    <HierarchyManagement
      tree={tree}
      employees={employees}
      permissionCodes={profile.permissionCodes}
    />
  );
}
