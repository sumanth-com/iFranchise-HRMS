import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { RecruitmentEmailNotifications } from "@/types/recruitment";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { getRecruitmentSettings } from "@/lib/recruitment/services/recruitment-settings";
import {
  createNotification,
  notifyEmployee,
} from "@/lib/notifications/services/notification-service";

async function notifyIfEnabled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  flag: keyof RecruitmentEmailNotifications,
  employeeId: string | null | undefined,
  title: string,
  message: string,
  notificationType: string,
  actionUrl: string,
  options?: {
    templateKey?: string;
    sourceEventKey?: string;
    priority?: "low" | "medium" | "high" | "critical";
    templateVariables?: Record<string, string>;
  },
) {
  if (!employeeId) return;

  const settings = await getRecruitmentSettings(
    supabase,
    profile.employee.organizationId,
  );
  if (!settings.emailNotifications[flag]) return;

  await notifyEmployee(supabase, {
    organizationId: profile.employee.organizationId,
    employeeId,
    title,
    message,
    notificationType,
    module: "recruitment",
    priority: options?.priority ?? "medium",
    actionUrl,
    sourceEventKey: options?.sourceEventKey,
    templateKey: options?.templateKey,
    templateVariables: options?.templateVariables,
    createdBy: profile.userId,
  });
}

export async function notifyInterviewScheduled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  interviewerEmployeeId: string,
  candidateName: string,
  roundName: string,
  whenLabel: string,
  interviewId?: string,
) {
  await notifyIfEnabled(
    supabase,
    profile,
    "interviewScheduled",
    interviewerEmployeeId,
    "Interview scheduled",
    `${roundName} with ${candidateName} is scheduled for ${whenLabel}.`,
    "interview_scheduled",
    RECRUITMENT_ROUTES.interviews,
    {
      templateKey: "interview_scheduled",
      sourceEventKey: interviewId
        ? `interview_scheduled:${interviewId}:${interviewerEmployeeId}`
        : undefined,
      priority: "high",
      templateVariables: { candidateName, roundName, when: whenLabel },
    },
  );
}

export async function notifyInterviewCancelled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  interviewerEmployeeId: string,
  candidateName: string,
  roundName: string,
  interviewId?: string,
) {
  await notifyIfEnabled(
    supabase,
    profile,
    "interviewCancelled",
    interviewerEmployeeId,
    "Interview cancelled",
    `${roundName} with ${candidateName} has been cancelled.`,
    "recruitment_interview_cancelled",
    RECRUITMENT_ROUTES.interviews,
    {
      sourceEventKey: interviewId
        ? `interview_cancelled:${interviewId}:${interviewerEmployeeId}`
        : undefined,
      priority: "medium",
    },
  );
}

export async function notifyOfferStatus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string | null | undefined,
  flag: "offerSent" | "offerAccepted" | "offerRejected",
  title: string,
  message: string,
  offerId?: string,
  candidateName?: string,
) {
  const employeeId = managerEmployeeId ?? profile.employee.id;
  await notifyIfEnabled(
    supabase,
    profile,
    flag,
    employeeId,
    title,
    message,
    flag === "offerSent" ? "offer_sent" : `recruitment_${flag}`,
    RECRUITMENT_ROUTES.offers,
    {
      templateKey: flag === "offerSent" ? "offer_sent" : undefined,
      sourceEventKey: offerId ? `${flag}:${offerId}:${employeeId}` : undefined,
      templateVariables: candidateName ? { candidateName } : undefined,
    },
  );
}

export async function notifyJoiningReminder(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string | null | undefined,
  candidateName: string,
  joiningDate: string,
  offerId?: string,
) {
  const employeeId = managerEmployeeId ?? profile.employee.id;
  await notifyIfEnabled(
    supabase,
    profile,
    "joiningReminder",
    employeeId,
    "Employee joined",
    `${candidateName} has joined the organization.`,
    "employee_joined",
    RECRUITMENT_ROUTES.offers,
    {
      templateKey: "employee_joined",
      sourceEventKey: offerId ? `employee_joined:${offerId}:${employeeId}` : undefined,
      templateVariables: { candidateName, joiningDate },
    },
  );
}

export async function notifyCandidateInterview(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  candidateUserId: string | null,
  candidateName: string,
  roundName: string,
  whenLabel: string,
  interviewId: string,
) {
  if (!candidateUserId) return;

  await createNotification(supabase, {
    organizationId: profile.employee.organizationId,
    userId: candidateUserId,
    title: "Interview scheduled",
    message: `Your ${roundName} interview is scheduled for ${whenLabel}.`,
    notificationType: "interview_scheduled",
    module: "recruitment",
    priority: "high",
    actionUrl: RECRUITMENT_ROUTES.interviews,
    sourceEventKey: `interview_candidate:${interviewId}`,
    templateKey: "interview_scheduled",
    templateVariables: { candidateName, roundName, when: whenLabel },
    createdBy: profile.userId,
  });
}
