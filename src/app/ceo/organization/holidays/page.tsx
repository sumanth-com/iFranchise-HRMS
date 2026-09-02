import { HolidaysManagement } from "@/components/organization/holidays-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import { getBranches, getDepartments } from "@/lib/organization/services/org-lookups";
import { listHolidays } from "@/lib/organization/services/org-queries";
import { clampHrmsYear, getDefaultHrmsYear } from "@/lib/date/hrms-year";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoHolidaysPage({ searchParams }: PageProps) {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const raw = await searchParams;

  const year = clampHrmsYear(
    typeof raw.year === "string" ? Number(raw.year) : getDefaultHrmsYear(),
  );
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
