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

  const [roles, permissions] = await Promise.all([
    getRoleLookupOptions(supabase, orgId),
    getAllPermissions(supabase),
  ]);

  const initialRoleId = roleId && roles.some((role) => role.id === roleId) ? roleId : roles[0]?.id;
  if (!initialRoleId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permission Matrix</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a role before assigning permissions.</p>
      </div>
    );
  }

  const detail = await getRolePermissionDetail(supabase, orgId, initialRoleId);

  return (
    <PermissionMatrix
      roles={roles}
      initialRoleId={initialRoleId}
      permissionCodes={profile.permissionCodes}
      matrix={buildPermissionMatrix(permissions)}
      detail={detail}
    />
  );
}
