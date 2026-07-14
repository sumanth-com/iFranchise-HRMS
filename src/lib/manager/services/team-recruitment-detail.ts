import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  ManagerRecruitmentContext,
  TeamCandidateRecruitmentProfile,
} from "@/types/manager-recruitment";
import { assertRecruitmentDepartmentAccess } from "@/lib/manager/services/manager-recruitment-context";
import { parseOfferNotesPayload } from "@/lib/manager/services/recruitment-evaluation-utils";
import { getCandidateById } from "@/lib/recruitment/services/recruitment-queries";
import {
  formatEmployeeName,
  fromHrms,
  type PerfRow,
  unwrapRelation,
} from "@/lib/recruitment/services/recruitment-utils";

async function assertCandidateInManagedDepartments(
  supabase: AuthSupabaseClient,
  organizationId: string,
  candidateId: string,
  departmentIds: string[],
) {
  const { data, error } = await fromHrms(supabase, "recruitment_candidates")
    .select(
      `id,
      job:job_opening_id!inner(department_id)`,
    )
    .eq("id", candidateId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Candidate not found");

  const job = unwrapRelation((data as PerfRow).job);
  assertRecruitmentDepartmentAccess(departmentIds, job?.department_id ?? null);
}

export async function getTeamCandidateRecruitmentProfile(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  context: ManagerRecruitmentContext,
  candidateId: string,
): Promise<TeamCandidateRecruitmentProfile | null> {
  const { organizationId, departmentIds, managerId } = context;
  if (!departmentIds.length) return null;

  await assertCandidateInManagedDepartments(
    supabase,
    organizationId,
    candidateId,
    departmentIds,
  );

  const detail = await getCandidateById(supabase, organizationId, candidateId);
  if (!detail) return null;

  const { data: jobRow } = await fromHrms(supabase, "recruitment_job_openings")
    .select(
      `hiring_manager:hiring_manager_id(first_name, last_name)`,
    )
    .eq("id", detail.jobOpeningId)
    .maybeSingle();

  const hiringManager = unwrapRelation((jobRow as PerfRow | null)?.hiring_manager ?? null);

  const pendingManagerInterview = detail.interviews.find(
    (interview) =>
      interview.interviewerEmployeeId === managerId &&
      interview.interviewStatus === "scheduled",
  );

  const pendingOffer = detail.offers.find((offer) => {
    if (!["draft", "sent"].includes(offer.offerStatus)) return false;
    const parsed = parseOfferNotesPayload(offer.notes);
    return !parsed.managerRecommendation;
  });

  return {
    id: detail.id,
    firstName: detail.firstName,
    lastName: detail.lastName,
    fullName: detail.fullName,
    email: detail.email,
    phone: detail.phone,
    experienceYears: detail.experienceYears,
    skills: detail.skills,
    currentCompany: detail.currentCompany,
    currentCtc: detail.currentCtc,
    expectedCtc: detail.expectedCtc,
    noticePeriodDays: detail.noticePeriodDays,
    source: detail.source,
    stage: detail.stage,
    jobOpeningId: detail.jobOpeningId,
    jobTitle: detail.jobTitle,
    departmentName: detail.departmentName,
    hiringManagerName: hiringManager
      ? formatEmployeeName(hiringManager.first_name, hiringManager.last_name)
      : null,
    resumePath: detail.resumePath,
    photoPath: detail.photoPath,
    notes: detail.notes,
    createdAt: detail.createdAt,
    timeline: detail.timeline,
    interviews: detail.interviews,
    offers: detail.offers,
    pendingManagerInterviewId: pendingManagerInterview?.id ?? null,
    pendingOfferId: pendingOffer?.id ?? null,
  };
}

export { assertCandidateInManagedDepartments };
