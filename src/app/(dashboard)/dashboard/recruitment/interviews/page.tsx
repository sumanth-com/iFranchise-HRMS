import { InterviewsManagement } from "@/components/recruitment/interviews-management";
import { createClient } from "@/lib/supabase/server";
import { canInterviewRecruitment } from "@/lib/recruitment/constants";
import {
  getRecruitmentLookups,
  listInterviews,
} from "@/lib/recruitment/services/recruitment-queries";
import { interviewListParamsSchema } from "@/lib/validations/recruitment";
import { requireServerPermission } from "@/lib/permissions/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InterviewsPage({ searchParams }: PageProps) {
  const profile = await requireServerPermission("recruitment.view");
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
      canInterview={canInterviewRecruitment(profile.permissionCodes)}
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
