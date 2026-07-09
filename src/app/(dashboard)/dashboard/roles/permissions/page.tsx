import { PermissionMatrix } from "@/components/roles/permission-matrix";
import { ROLE_VIEW_PERMISSIONS } from "@/lib/roles/constants";
import {
  buildPermissionMatrix,
  getAllPermissions,
  getRoleLookupOptions,
  getRolePermissionDetail,
} from "@/lib/roles/services/role-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PermissionMatrixPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...ROLE_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;
  const roleId = typeof raw.roleId === "string" ? raw.roleId : undefined;

  const [permissions, roles] = await Promise.all([
    getAllPermissions(supabase),
    getRoleLookupOptions(supabase, orgId),
  ]);

  const matrix = buildPermissionMatrix(permissions);
  const initialRoleId = roleId ?? roles[0]?.id;
  const detail = initialRoleId
    ? await getRolePermissionDetail(supabase, orgId, initialRoleId)
    : {
        roleId: "",
        roleName: "",
        directPermissionIds: [] as string[],
        inheritedPermissionIds: [] as string[],
        effectivePermissionIds: [] as string[],
        parentRoleId: null,
        parentRoleName: null,
      };

  if (!initialRoleId) {
    return (
      <div className="text-muted-foreground">No roles available. Create a role first.</div>
    );
  }

  return (
    <PermissionMatrix
      roles={roles}
      initialRoleId={initialRoleId}
      permissionCodes={profile.permissionCodes}
      matrix={matrix}
      detail={detail}
    />
  );
}
