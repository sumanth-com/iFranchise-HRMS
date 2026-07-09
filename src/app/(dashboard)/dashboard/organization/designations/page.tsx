import { DesignationsManagement } from "@/components/organization/designations-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { getDepartments } from "@/lib/organization/services/org-lookups";
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
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
  });

  const [result, departments] = await Promise.all([
    listDesignations(supabase, orgId, params),
    getDepartments(supabase, orgId),
  ]);

  return (
    <DesignationsManagement
      result={result}
      departments={departments}
      permissionCodes={profile.permissionCodes}
      search={params.search ?? ""}
      status={params.status as RecordStatus | undefined}
    />
  );
}
