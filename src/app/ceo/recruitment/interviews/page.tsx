import { InterviewsManagement } from "@/components/recruitment/interviews-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  getRecruitmentLookups,
  listInterviews,
} from "@/lib/recruitment/services/recruitment-queries";
import { createClient } from "@/lib/supabase/server";
import { interviewListParamsSchema } from "@/lib/validations/recruitment";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoInterviewsPage({ searchParams }: PageProps) {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
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

  const [result, lookups] = await Promise.all([
    listInterviews(supabase, profile, params),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <InterviewsManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      canInterview={false}
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
