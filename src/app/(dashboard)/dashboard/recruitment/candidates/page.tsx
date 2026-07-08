import { CandidatesManagement } from "@/components/recruitment/candidates-management";
import { createClient } from "@/lib/supabase/server";
import {
  canCreateRecruitment,
  canEditRecruitment,
  canInterviewRecruitment,
  canManageOffers,
} from "@/lib/recruitment/constants";
import {
  getCandidateById,
  getRecruitmentLookups,
  listCandidates,
} from "@/lib/recruitment/services/recruitment-queries";
import { candidateListParamsSchema } from "@/lib/validations/recruitment";
import { requireServerPermission } from "@/lib/permissions/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CandidatesPage({ searchParams }: PageProps) {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = candidateListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    departmentId: raw.departmentId,
    jobOpeningId: raw.jobOpeningId,
    stage: raw.stage,
  });

  const candidateId = typeof raw.candidateId === "string" ? raw.candidateId : undefined;

  const [result, lookups, selected] = await Promise.all([
    listCandidates(supabase, profile, params),
    getRecruitmentLookups(supabase, profile.employee.organizationId),
    candidateId
      ? getCandidateById(supabase, profile.employee.organizationId, candidateId)
      : Promise.resolve(null),
  ]);

  return (
    <CandidatesManagement
      records={result.data}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      lookups={lookups}
      selected={selected}
      canCreate={canCreateRecruitment(profile.permissionCodes)}
      canEdit={canEditRecruitment(profile.permissionCodes)}
      canInterview={canInterviewRecruitment(profile.permissionCodes)}
      canOffer={canManageOffers(profile.permissionCodes)}
      filters={{
        search: params.search,
        departmentId: params.departmentId,
        jobOpeningId: params.jobOpeningId,
        stage: params.stage,
      }}
    />
  );
}
