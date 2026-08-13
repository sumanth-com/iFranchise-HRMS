import { DesignationsManagement } from "@/components/organization/designations-management";
import {
  requireCeoPortal,
  toViewOnlyPermissionCodes,
} from "@/lib/ceo/read-only-permissions";
import { getDepartments, getEmploymentTypes } from "@/lib/organization/services/org-lookups";
import { listDesignations } from "@/lib/organization/services/org-queries";
import { createClient } from "@/lib/supabase/server";
import { orgListParamsSchema } from "@/lib/validations/organization";
import type { RecordStatus } from "@/types/auth";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoDesignationsPage({ searchParams }: PageProps) {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;

  const params = orgListParamsSchema.parse({
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
      permissionCodes={toViewOnlyPermissionCodes(profile.permissionCodes)}
      search={params.search ?? ""}
      status={params.status as RecordStatus | undefined}
    />
  );
}
