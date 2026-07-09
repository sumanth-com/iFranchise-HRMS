import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { applyTemplate } from "@/lib/notifications/services/notification-service";
import type {
  NotificationPreferencesFormInput,
  NotificationSettingsFormInput,
  NotificationTemplateFormInput,
} from "@/lib/validations/notifications";

export async function markNotificationRead(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("notifications")
    .update({
      notification_status: "read",
      read_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", notificationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("notifications")
    .update({
      notification_status: "read",
      read_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("organization_id", profile.employee.organizationId)
    .eq("user_id", profile.userId)
    .eq("notification_status", "unread")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function archiveNotification(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("notifications")
    .update({
      notification_status: "archived",
      archived_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", notificationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function deleteNotification(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("notifications")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", notificationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function saveNotificationTemplate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: NotificationTemplateFormInput,
  id?: string,
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const payload = {
    organization_id: organizationId,
    template_key: input.templateKey,
    name: input.name,
    module: input.module,
    subject: input.subject,
    body_template: input.bodyTemplate,
    variables: input.variables,
    updated_by: profile.userId,
  };

  if (id) {
    const { error } = await supabase
      .schema("hrms")
      .from("notification_templates")
      .update(payload)
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("notification_templates")
    .insert({
      ...payload,
      status: "active",
      created_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save template");
  return data.id;
}

export async function saveNotificationSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: NotificationSettingsFormInput,
): Promise<void> {
  const organizationId = profile.employee.organizationId;
  const typeSettings = Object.fromEntries(
    Object.entries(input.typeSettings).map(([key, value]) => [
      key,
      { in_app: value.inApp, email: value.email, push: value.push },
    ]),
  );

  const { data: existing } = await supabase
    .schema("hrms")
    .from("notification_settings")
    .select("id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("notification_settings")
      .update({
        type_settings: typeSettings,
        updated_by: profile.userId,
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.schema("hrms").from("notification_settings").insert({
    organization_id: organizationId,
    type_settings: typeSettings,
    status: "active",
    created_by: profile.userId,
    updated_by: profile.userId,
  });

  if (error) throw new Error(error.message);
}

export async function saveNotificationUserPreferences(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: NotificationPreferencesFormInput,
): Promise<void> {
  const organizationId = profile.employee.organizationId;
  const payload = {
    receive_email: input.receiveEmail,
    receive_in_app: input.receiveInApp,
    mute_notifications: input.muteNotifications,
    daily_digest: input.dailyDigest,
    weekly_digest: input.weeklyDigest,
    updated_by: profile.userId,
  };

  const { data: existing } = await supabase
    .schema("hrms")
    .from("notification_user_preferences")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("notification_user_preferences")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.schema("hrms").from("notification_user_preferences").insert({
    organization_id: organizationId,
    user_id: profile.userId,
    ...payload,
    status: "active",
    created_by: profile.userId,
  });

  if (error) throw new Error(error.message);
}

export function previewNotificationTemplate(
  subject: string,
  bodyTemplate: string,
  variables: Record<string, string>,
) {
  return {
    subject: applyTemplate(subject, variables),
    body: applyTemplate(bodyTemplate, variables),
  };
}
