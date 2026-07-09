import { HolidaysManagement } from "@/components/organization/holidays-management";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { getBranches, getDepartments } from "@/lib/organization/services/org-lookups";
import { listHolidays } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HolidaysPage({ searchParams }: PageProps) {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;

  const year = typeof raw.year === "string" ? Number(raw.year) : new Date().getFullYear();
  const search = typeof raw.search === "string" ? raw.search : undefined;
  const viewMode = raw.view === "calendar" ? "calendar" : "list";

  const [result, branches, departments] = await Promise.all([
    listHolidays(supabase, orgId, { year, search }),
    getBranches(supabase, orgId),
    getDepartments(supabase, orgId),
  ]);

  return (
    <HolidaysManagement
      result={result}
      branches={branches}
      departments={departments}
      permissionCodes={profile.permissionCodes}
      viewMode={viewMode}
      search={search ?? ""}
    />
  );
}
