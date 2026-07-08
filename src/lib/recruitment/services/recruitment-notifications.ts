import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { RecruitmentEmailNotifications } from "@/types/recruitment";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { getRecruitmentSettings } from "@/lib/recruitment/services/recruitment-settings";

async function getEmployeeUserId(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("user_id")
    .eq("employee_id", employeeId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}

async function createNotification(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string,
  employeeId: string,
  title: string,
  message: string,
  notificationType: string,
  actionUrl: string,
) {
  const { error } = await supabase.schema("hrms").from("notifications").insert({
    organization_id: organizationId,
    user_id: userId,
    employee_id: employeeId,
    title,
    message,
    notification_type: notificationType,
    notification_status: "unread",
    action_url: actionUrl,
    status: "active",
  });

  if (error) throw new Error(error.message);
}

async function notifyIfEnabled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  flag: keyof RecruitmentEmailNotifications,
  employeeId: string | null | undefined,
  title: string,
  message: string,
  notificationType: string,
  actionUrl: string,
) {
  if (!employeeId) return;

  const settings = await getRecruitmentSettings(
    supabase,
    profile.employee.organizationId,
  );
  if (!settings.emailNotifications[flag]) return;

  const userId = await getEmployeeUserId(supabase, employeeId);
  if (!userId) return;

  await createNotification(
    supabase,
    profile.employee.organizationId,
    userId,
    employeeId,
    title,
    message,
    notificationType,
    actionUrl,
  );
}

export async function notifyInterviewScheduled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  interviewerEmployeeId: string,
  candidateName: string,
  roundName: string,
  whenLabel: string,
) {
  await notifyIfEnabled(
    supabase,
    profile,
    "interviewScheduled",
    interviewerEmployeeId,
    "Interview scheduled",
    `${roundName} with ${candidateName} is scheduled for ${whenLabel}.`,
    "recruitment_interview_scheduled",
    RECRUITMENT_ROUTES.interviews,
  );
}

export async function notifyInterviewCancelled(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  interviewerEmployeeId: string,
  candidateName: string,
  roundName: string,
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
  );
}

export async function notifyOfferStatus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string | null | undefined,
  flag: "offerSent" | "offerAccepted" | "offerRejected",
  title: string,
  message: string,
) {
  await notifyIfEnabled(
    supabase,
    profile,
    flag,
    managerEmployeeId ?? profile.employee.id,
    title,
    message,
    `recruitment_${flag}`,
    RECRUITMENT_ROUTES.offers,
  );
}

export async function notifyJoiningReminder(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  managerEmployeeId: string | null | undefined,
  candidateName: string,
  joiningDate: string,
) {
  await notifyIfEnabled(
    supabase,
    profile,
    "joiningReminder",
    managerEmployeeId ?? profile.employee.id,
    "Joining reminder",
    `${candidateName} is scheduled to join on ${joiningDate}.`,
    "recruitment_joining_reminder",
    RECRUITMENT_ROUTES.offers,
  );
}
