import { RolesManagement } from "@/components/roles/roles-management";
import { ROLE_VIEW_PERMISSIONS } from "@/lib/roles/constants";
import { getRoleLookupOptions, listRoles } from "@/lib/roles/services/role-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { roleListParamsSchema } from "@/lib/validations/roles";
import type { RecordStatus } from "@/types/auth";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RolesManagePage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...ROLE_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;

  const params = roleListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  });

  const [result, roleOptions] = await Promise.all([
    listRoles(supabase, orgId, params),
    getRoleLookupOptions(supabase, orgId),
  ]);

  return (
    <RolesManagement
      result={result}
      roleOptions={roleOptions}
      permissionCodes={profile.permissionCodes}
      search={params.search ?? ""}
      status={params.status as RecordStatus | undefined}
    />
  );
}
