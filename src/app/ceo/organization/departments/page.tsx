import { DepartmentsManagement } from "@/components/organization/departments-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import { getBranches, getEmployeeLookups } from "@/lib/organization/services/org-lookups";
import { listDepartments } from "@/lib/organization/services/org-queries";
import { createClient } from "@/lib/supabase/server";
import { orgListParamsSchema } from "@/lib/validations/organization";
import type { RecordStatus } from "@/types/auth";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoDepartmentsPage({ searchParams }: PageProps) {
  const profile = await requireCeoPortal();
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
