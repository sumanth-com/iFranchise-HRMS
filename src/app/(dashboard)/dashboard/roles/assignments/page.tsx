import { UserRoleAssignments } from "@/components/roles/user-role-assignments";
import { ROLE_VIEW_PERMISSIONS } from "@/lib/roles/constants";
import {
  getAssignableEmployees,
  getRoleLookupOptions,
  listUserRoleAssignments,
} from "@/lib/roles/services/role-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { userRoleListParamsSchema } from "@/lib/validations/roles";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UserRoleAssignmentsPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...ROLE_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;

  const params = userRoleListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    roleId: typeof raw.roleId === "string" ? raw.roleId : undefined,
  });

  const [result, employees, roles] = await Promise.all([
    listUserRoleAssignments(supabase, orgId, params),
    getAssignableEmployees(supabase, orgId),
    getRoleLookupOptions(supabase, orgId),
  ]);

  return (
    <UserRoleAssignments
      result={result}
      employees={employees}
      roles={roles}
      permissionCodes={profile.permissionCodes}
      search={params.search ?? ""}
      roleId={params.roleId}
    />
  );
}
