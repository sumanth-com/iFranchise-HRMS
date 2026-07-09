import { BranchesManagement } from "@/components/organization/branches-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { getEmployeeLookups } from "@/lib/organization/services/org-lookups";
import { listBranches } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { orgListParamsSchema } from "@/lib/validations/organization";
import type { RecordStatus } from "@/types/auth";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BranchesPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const raw = await searchParams;

  const params = orgListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  });

  const [result, employees] = await Promise.all([
    listBranches(supabase, profile.employee.organizationId, params),
    getEmployeeLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <BranchesManagement
      result={result}
      employees={employees}
      permissionCodes={profile.permissionCodes}
      search={params.search ?? ""}
      status={params.status as RecordStatus | undefined}
    />
  );
}
