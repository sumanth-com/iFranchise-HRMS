import { JobsManagement } from "@/components/recruitment/jobs-management";
import { createClient } from "@/lib/supabase/server";
import {
  canCreateRecruitment,
  canEditRecruitment,
} from "@/lib/recruitment/constants";
import {
  getRecruitmentLookups,
  listJobOpenings,
} from "@/lib/recruitment/services/recruitment-queries";
import { jobListParamsSchema } from "@/lib/validations/recruitment";
import { requireServerPermission } from "@/lib/permissions/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JobsPage({ searchParams }: PageProps) {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = jobListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    departmentId: raw.departmentId,
    jobStatus: raw.jobStatus,
    employmentTypeId: raw.employmentTypeId,
    location: typeof raw.location === "string" ? raw.location : undefined,
  });

  const [result, lookups] = await Promise.all([
    listJobOpenings(supabase, profile, params),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <JobsManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      canCreate={canCreateRecruitment(profile.permissionCodes)}
      canEdit={canEditRecruitment(profile.permissionCodes)}
      filters={{
        search: params.search,
        departmentId: params.departmentId,
        jobStatus: params.jobStatus,
        employmentTypeId: params.employmentTypeId,
        location: params.location,
      }}
    />
  );
}
