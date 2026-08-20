import { BranchesPageContent } from "@/components/organization/branches-page-content";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import { getBranches, getEmployeeLookups } from "@/lib/organization/services/org-lookups";
import { listBranches, listWorkLocations } from "@/lib/organization/services/org-queries";
import { createClient } from "@/lib/supabase/server";
import { orgListParamsSchema } from "@/lib/validations/organization";
import type { RecordStatus } from "@/types/auth";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function CeoBranchesPage({ searchParams }: PageProps) {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;

  const branchParams = orgListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: firstString(raw.search),
    status: firstString(raw.status),
  });

  const workLocationParams = orgListParamsSchema.parse({
    page: raw.wlPage,
    pageSize: raw.wlPageSize,
    search: firstString(raw.wlSearch),
    status: firstString(raw.wlStatus),
  });

  const [branchesResult, workLocationsResult, employees, branchLookups] = await Promise.all([
    listBranches(supabase, orgId, branchParams),
    listWorkLocations(supabase, orgId, workLocationParams),
    getEmployeeLookups(supabase, orgId),
    getBranches(supabase, orgId),
  ]);

  return (
    <BranchesPageContent
      branchesResult={branchesResult}
      workLocationsResult={workLocationsResult}
      employees={employees}
      branchLookups={branchLookups}
      permissionCodes={profile.permissionCodes}
      branchSearch={branchParams.search ?? ""}
      branchStatus={branchParams.status as RecordStatus | undefined}
      workLocationSearch={workLocationParams.search ?? ""}
      workLocationStatus={workLocationParams.status as RecordStatus | undefined}
    />
  );
}
