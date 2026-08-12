import { DesignationsManagement } from "@/components/organization/designations-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { getDepartments, getEmploymentTypes } from "@/lib/organization/services/org-lookups";
import { listDesignations } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { orgListParamsSchema } from "@/lib/validations/organization";
import type { RecordStatus } from "@/types/auth";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DesignationsPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;

  const params = orgListParamsSchema.parse({
    // Keep this page as a single list.
    // Also ensures "newly added" appears first because the list sorting is handled server-side.
    page: 1,
    pageSize: 100,
    search: typeof raw.search === "string" ? raw.search : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  });

  const [result, departments, employmentTypes] = await Promise.all([
    listDesignations(supabase, orgId, params),
    getDepartments(supabase, orgId),
    getEmploymentTypes(supabase, orgId),
  ]);

  return (
    <DesignationsManagement
      result={result}
      departments={departments}
      employmentTypes={employmentTypes}
      permissionCodes={profile.permissionCodes}
      search={params.search ?? ""}
      status={params.status as RecordStatus | undefined}
    />
  );
}
