import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getHrApproverEmployeeId } from "@/lib/leave/services/leave-queries";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { notifyEmployee } from "@/lib/notifications/services/notification-service";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import {
  notifyInterviewScheduled,
} from "@/lib/recruitment/services/recruitment-notifications";
import type { UserProfile } from "@/types/auth";

export async function notifyManagerInterviewScheduled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string,
  candidateName: string,
  roundName: string,
  whenLabel: string,
  interviewId: string,
) {
  await notifyInterviewScheduled(
    supabase,
    profile,
    managerEmployeeId,
    candidateName,
    roundName,
    whenLabel,
    interviewId,
  );
}

export async function notifyManagerFeedbackPending(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string,
  candidateName: string,
  interviewId: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: managerEmployeeId,
    title: "Interview feedback pending",
    message: `Please submit feedback for ${candidateName}'s interview.`,
    notificationType: "recruitment_feedback_pending",
    module: "recruitment",
    priority: "high",
    actionUrl: `${MANAGER_ROUTES.recruitment}?candidateId=${interviewId}`,
    sourceEventKey: `manager_feedback_pending:${interviewId}:${managerEmployeeId}`,
    createdBy: profile.userId,
  });
}

export async function notifyManagerCandidateAssigned(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string,
  candidateName: string,
  jobTitle: string,
  candidateId: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: managerEmployeeId,
    title: "Candidate assigned",
    message: `${candidateName} applied for ${jobTitle}. Review the profile in your recruitment dashboard.`,
    notificationType: "recruitment_candidate_assigned",
    module: "recruitment",
    priority: "medium",
    actionUrl: `${MANAGER_ROUTES.recruitment}?candidateId=${candidateId}`,
    sourceEventKey: `manager_candidate_assigned:${candidateId}:${managerEmployeeId}`,
    createdBy: profile.userId,
  });
}

export async function notifyManagerOfferAwaitingRecommendation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string,
  candidateName: string,
  offerId: string,
) {
  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: managerEmployeeId,
    title: "Offer awaiting recommendation",
    message: `Review and recommend approval for ${candidateName}'s offer.`,
    notificationType: "recruitment_offer_approval",
    module: "recruitment",
    priority: "high",
    actionUrl: `${MANAGER_ROUTES.recruitment}?candidateId=${offerId}`,
    sourceEventKey: `manager_offer_approval:${offerId}:${managerEmployeeId}`,
    createdBy: profile.userId,
  });
}

export async function notifyHrManagerFeedbackSubmitted(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerName: string,
  candidateName: string,
  candidateId: string,
) {
  const hrEmployeeId = await getHrApproverEmployeeId(
    supabase,
    profile.employee.organizationId,
  );
  if (!hrEmployeeId) return;

  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: hrEmployeeId,
    title: "Manager submitted interview feedback",
    message: `${managerName} submitted feedback for ${candidateName}.`,
    notificationType: "recruitment_manager_feedback",
    module: "recruitment",
    priority: "medium",
    actionUrl: `${RECRUITMENT_ROUTES.candidates}?candidateId=${candidateId}`,
    sourceEventKey: `hr_manager_feedback:${candidateId}:${profile.employee.id}`,
    createdBy: profile.userId,
  });
}

export async function notifyHrManagerOfferRecommendation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerName: string,
  candidateName: string,
  recommendation: "approve" | "revise" | "reject",
  offerId: string,
) {
  const hrEmployeeId = await getHrApproverEmployeeId(
    supabase,
    profile.employee.organizationId,
  );
  if (!hrEmployeeId) return;

  const label =
    recommendation === "approve"
      ? "recommended offer approval"
      : recommendation === "revise"
        ? "requested offer revision"
        : "recommended rejection";

  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: hrEmployeeId,
    title: "Manager offer recommendation",
    message: `${managerName} ${label} for ${candidateName}.`,
    notificationType: "recruitment_manager_offer_recommendation",
    module: "recruitment",
    priority: "high",
    actionUrl: `${RECRUITMENT_ROUTES.offers}?offerId=${offerId}`,
    sourceEventKey: `hr_manager_offer:${offerId}:${profile.employee.id}:${recommendation}`,
    createdBy: profile.userId,
  });
}

export async function notifyHrManagerRejectionRecommendation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerName: string,
  candidateName: string,
  candidateId: string,
) {
  const hrEmployeeId = await getHrApproverEmployeeId(
    supabase,
    profile.employee.organizationId,
  );
  if (!hrEmployeeId) return;

  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId: hrEmployeeId,
    title: "Manager recommended rejection",
    message: `${managerName} recommended rejecting ${candidateName}.`,
    notificationType: "recruitment_manager_rejection",
    module: "recruitment",
    priority: "medium",
    actionUrl: `${RECRUITMENT_ROUTES.candidates}?candidateId=${candidateId}`,
    sourceEventKey: `hr_manager_rejection:${candidateId}:${profile.employee.id}`,
    createdBy: profile.userId,
  });
}
