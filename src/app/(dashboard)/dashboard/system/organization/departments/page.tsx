import { DepartmentsManagement } from "@/components/organization/departments-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { getBranches, getEmployeeLookups } from "@/lib/organization/services/org-lookups";
import { listDepartments } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { createClient } from "@/lib/supabase/server";
import { orgListParamsSchema } from "@/lib/validations/organization";
import type { RecordStatus } from "@/types/auth";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminDepartmentsPage({ searchParams }: PageProps) {
  await requireSuperAdminProfile();
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;

  const params = orgListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  });

  const [result, employees, branches] = await Promise.all([
    listDepartments(supabase, orgId, params),
    getEmployeeLookups(supabase, orgId),
    getBranches(supabase, orgId),
  ]);

  return (
    <DepartmentsManagement
      result={result}
      employees={employees}
      branches={branches}
      permissionCodes={profile.permissionCodes}
      search={params.search ?? ""}
      status={params.status as RecordStatus | undefined}
    />
  );
}
