import { JobsManagement } from "@/components/recruitment/jobs-management";
import { loadManagerRecruitmentPage } from "@/lib/manager/load-admin-context";
import { listJobOpenings } from "@/lib/recruitment/services/recruitment-queries";
import { jobListParamsSchema } from "@/lib/validations/recruitment";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerJobsPage({ searchParams }: PageProps) {
  const { profile, supabase, lookups } = await loadManagerRecruitmentPage();
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

  const result = await listJobOpenings(supabase, profile, params);

  return (
    <JobsManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      canCreate
      canEdit
      canDelete
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
