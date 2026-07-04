import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { LEAVE_ROUTES } from "@/lib/leave/constants";

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

export async function notifyLeaveSubmitted(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
) {
  const userId = await getEmployeeUserId(supabase, employeeId);
  if (!userId) return;

  await createNotification(
    supabase,
    profile.employee.organizationId,
    userId,
    employeeId,
    "Leave request submitted",
    "Your leave request has been submitted and is pending approval.",
    "leave_submitted",
    LEAVE_ROUTES.detail(leaveRequestId),
  );
}

export async function notifyLeaveApproved(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
) {
  const userId = await getEmployeeUserId(supabase, employeeId);
  if (!userId) return;

  await createNotification(
    supabase,
    profile.employee.organizationId,
    userId,
    employeeId,
    "Leave request approved",
    "Your leave request has been approved.",
    "leave_approved",
    LEAVE_ROUTES.detail(leaveRequestId),
  );
}

export async function notifyLeaveRejected(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  leaveRequestId: string,
  employeeId: string,
) {
  const userId = await getEmployeeUserId(supabase, employeeId);
  if (!userId) return;

  await createNotification(
    supabase,
    profile.employee.organizationId,
    userId,
    employeeId,
    "Leave request rejected",
    "Your leave request has been rejected.",
    "leave_rejected",
    LEAVE_ROUTES.detail(leaveRequestId),
  );
}
