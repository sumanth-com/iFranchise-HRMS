import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  DEFAULT_CHANNEL_SETTINGS,
  NOTIFICATION_MODULES,
} from "@/lib/notifications/constants";
import { parseNotificationsGlobal } from "@/lib/company-settings/services/company-settings-parsers";
import type {
  NotificationChannel,
  NotificationModule,
  NotificationPriority,
  NotificationTypeChannelSettings,
} from "@/types/notifications";

export type CreateNotificationInput = {
  organizationId: string;
  userId: string;
  employeeId?: string | null;
  title: string;
  message: string;
  notificationType: string;
  module: NotificationModule;
  priority?: NotificationPriority;
  actionUrl?: string | null;
  sourceEventKey?: string;
  templateKey?: string;
  templateVariables?: Record<string, string>;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
};

export async function getEmployeeUserId(
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

export function applyTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
}

async function getTemplateByKey(
  supabase: AuthSupabaseClient,
  organizationId: string,
  templateKey: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("notification_templates")
    .select("subject, body_template")
    .eq("organization_id", organizationId)
    .eq("template_key", templateKey)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function getUserPreferences(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("notification_user_preferences")
    .select("receive_email, receive_in_app, mute_notifications")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function getGlobalNotificationSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return parseNotificationsGlobal(
    (data?.settings as Record<string, unknown> | null) ?? null,
  );
}

async function getOrgChannelSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
  module: NotificationModule,
): Promise<NotificationTypeChannelSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("notification_settings")
    .select("type_settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const settings = (data?.type_settings as Record<string, NotificationTypeChannelSettings> | null)?.[
    module
  ];

  return {
    inApp: settings?.inApp ?? DEFAULT_CHANNEL_SETTINGS.inApp,
    email: settings?.email ?? DEFAULT_CHANNEL_SETTINGS.email,
    push: settings?.push ?? DEFAULT_CHANNEL_SETTINGS.push,
  };
}

async function createDeliveryRecords(
  supabase: AuthSupabaseClient,
  organizationId: string,
  notificationId: string,
  channels: NotificationChannel[],
  createdBy?: string | null,
) {
  if (channels.length === 0) return;

  const rows = channels.map((channel) => ({
    organization_id: organizationId,
    notification_id: notificationId,
    channel,
    delivery_status: channel === "in_app" ? ("delivered" as const) : ("pending" as const),
    attempted_at: channel === "in_app" ? new Date().toISOString() : null,
    delivered_at: channel === "in_app" ? new Date().toISOString() : null,
    status: "active" as const,
    created_by: createdBy ?? null,
    updated_by: createdBy ?? null,
  }));

  const { error } = await supabase.schema("hrms").from("notification_deliveries").insert(rows);
  if (error) throw new Error(error.message);
}

export async function createNotification(
  supabase: AuthSupabaseClient,
  input: CreateNotificationInput,
): Promise<string | null> {
  const prefs = await getUserPreferences(supabase, input.organizationId, input.userId);
  if (prefs?.mute_notifications) return null;

  const channelSettings = await getOrgChannelSettings(
    supabase,
    input.organizationId,
    input.module,
  );

  const globalSettings = await getGlobalNotificationSettings(
    supabase,
    input.organizationId,
  );

  let title = input.title;
  let message = input.message;

  if (input.templateKey) {
    const template = await getTemplateByKey(
      supabase,
      input.organizationId,
      input.templateKey,
    );
    if (template) {
      const vars = input.templateVariables ?? {};
      title = applyTemplate(template.subject, vars);
      message = applyTemplate(template.body_template, vars);
    }
  }

  const receiveInApp = prefs?.receive_in_app ?? true;
  const receiveEmail = prefs?.receive_email ?? true;

  const channels: NotificationChannel[] = [];
  if (globalSettings.inAppEnabled && channelSettings.inApp && receiveInApp) channels.push("in_app");
  if (globalSettings.emailEnabled && channelSettings.email && receiveEmail) channels.push("email");
  if (channelSettings.push) channels.push("push");

  if (channels.length === 0) return null;

  const { data, error } = await supabase
    .schema("hrms")
    .from("notifications")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      employee_id: input.employeeId ?? null,
      title,
      message,
      notification_type: input.notificationType,
      notification_status: "unread",
      module: input.module,
      priority: input.priority ?? "medium",
      source_event_key: input.sourceEventKey ?? null,
      action_url: input.actionUrl ?? null,
      metadata: input.metadata ?? {},
      status: "active",
      created_by: input.createdBy ?? null,
      updated_by: input.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && input.sourceEventKey) return null;
    throw new Error(error.message);
  }

  if (!data) return null;

  await createDeliveryRecords(
    supabase,
    input.organizationId,
    data.id,
    channels,
    input.createdBy,
  );

  return data.id;
}

export async function notifyEmployee(
  supabase: AuthSupabaseClient,
  input: Omit<CreateNotificationInput, "userId"> & { employeeId: string },
): Promise<string | null> {
  const userId = await getEmployeeUserId(supabase, input.employeeId);
  if (!userId) return null;

  return createNotification(supabase, {
    ...input,
    userId,
    employeeId: input.employeeId,
  });
}

export function defaultTypeSettings(): Record<NotificationModule, NotificationTypeChannelSettings> {
  const settings = {} as Record<NotificationModule, NotificationTypeChannelSettings>;
  for (const mod of NOTIFICATION_MODULES) {
    settings[mod.value] = { ...DEFAULT_CHANNEL_SETTINGS };
  }
  return settings;
}
