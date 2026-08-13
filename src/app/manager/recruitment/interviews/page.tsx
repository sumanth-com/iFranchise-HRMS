import { InterviewsManagement } from "@/components/recruitment/interviews-management";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { loadManagerRecruitmentPage } from "@/lib/manager/load-admin-context";
import { listInterviews } from "@/lib/recruitment/services/recruitment-queries";
import { interviewListParamsSchema } from "@/lib/validations/recruitment";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerInterviewsPage({ searchParams }: PageProps) {
  const { profile, supabase, lookups } = await loadManagerRecruitmentPage();
  const raw = await searchParams;

  const params = interviewListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    jobOpeningId: raw.jobOpeningId,
    interviewStatus: raw.interviewStatus,
    interviewerId: raw.interviewerId,
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : undefined,
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : undefined,
  });

  const result = await listInterviews(supabase, profile, params);

  return (
    <InterviewsManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      canInterview
      candidatesHref={MANAGER_ROUTES.recruitmentCandidates}
      filters={{
        search: params.search,
        jobOpeningId: params.jobOpeningId,
        interviewStatus: params.interviewStatus,
        interviewerId: params.interviewerId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      }}
    />
  );
}
