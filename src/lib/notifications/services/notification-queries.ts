import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { canManageNotifications } from "@/lib/notifications/constants";
import {
  notificationHistoryParamsSchema,
  notificationListParamsSchema,
  type NotificationListParams,
} from "@/lib/validations/notifications";
import type {
  NotificationBellData,
  NotificationBellItem,
  NotificationDashboardStats,
  NotificationHistoryParams,
  NotificationListItem,
  NotificationListResult,
  NotificationSettings,
  NotificationTemplateItem,
  NotificationUserPreferences,
} from "@/types/notifications";
import { defaultTypeSettings } from "@/lib/notifications/services/notification-service";

type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  module: string;
  priority: string;
  employee_id: string | null;
  user_id: string;
  notification_status: string;
  action_url: string | null;
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
  employees?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

function mapNotificationRow(row: NotificationRow): NotificationListItem {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  const recipientName = employee
    ? `${employee.first_name} ${employee.last_name}`.trim()
    : null;

  return {
    id: row.id,
    type: row.notification_type,
    title: row.title,
    message: row.message,
    module: row.module as NotificationListItem["module"],
    priority: row.priority as NotificationListItem["priority"],
    recipientName,
    employeeId: row.employee_id,
    userId: row.user_id,
    status: row.notification_status as NotificationListItem["status"],
    actionUrl: row.action_url,
    createdAt: row.created_at,
    readAt: row.read_at,
    archivedAt: row.archived_at,
  };
}

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function listNotifications(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: NotificationListParams,
  scope: "own" | "org" = "own",
): Promise<NotificationListResult> {
  const parsed = notificationListParamsSchema.parse(params);
  const isAdmin = canManageNotifications(profile.permissionCodes) && scope === "org";
  const from = (parsed.page - 1) * parsed.pageSize;
  const to = from + parsed.pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("notifications")
    .select(
      `id, notification_type, title, message, module, priority, employee_id, user_id,
       notification_status, action_url, created_at, read_at, archived_at,
       employees:employee_id (first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("user_id", profile.userId);
  }

  if (parsed.tab === "unread") query = query.eq("notification_status", "unread");
  else if (parsed.tab === "read") query = query.eq("notification_status", "read");
  else if (parsed.tab === "archived") query = query.eq("notification_status", "archived");
  else query = query.neq("notification_status", "archived");

  if (parsed.search?.trim()) {
    const term = `%${parsed.search.trim()}%`;
    query = query.or(`title.ilike.${term},message.ilike.${term}`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    items: (data ?? []).map((row) => mapNotificationRow(row as NotificationRow)),
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function listNotificationHistory(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: NotificationHistoryParams,
): Promise<NotificationListResult> {
  const parsed = notificationHistoryParamsSchema.parse(params);
  const isAdmin = canManageNotifications(profile.permissionCodes);
  const from = (parsed.page - 1) * parsed.pageSize;
  const to = from + parsed.pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("notifications")
    .select(
      `id, notification_type, title, message, module, priority, employee_id, user_id,
       notification_status, action_url, created_at, read_at, archived_at,
       employees:employee_id (first_name, last_name)`,
      { count: "exact" },
    )
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("user_id", profile.userId);
  } else if (parsed.employeeId) {
    query = query.eq("employee_id", parsed.employeeId);
  }

  if (parsed.module) query = query.eq("module", parsed.module);
  if (parsed.type) query = query.eq("notification_type", parsed.type);
  if (parsed.priority) query = query.eq("priority", parsed.priority);
  if (parsed.status) query = query.eq("notification_status", parsed.status);
  if (parsed.dateFrom) query = query.gte("created_at", parsed.dateFrom);
  if (parsed.dateTo) query = query.lte("created_at", `${parsed.dateTo}T23:59:59.999Z`);
  if (parsed.search?.trim()) {
    const term = `%${parsed.search.trim()}%`;
    query = query.or(`title.ilike.${term},message.ilike.${term}`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    items: (data ?? []).map((row) => mapNotificationRow(row as NotificationRow)),
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function getNotificationDashboardStats(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<NotificationDashboardStats> {
  const organizationId = profile.employee.organizationId;
  const isAdmin = canManageNotifications(profile.permissionCodes);
  const todayStart = startOfTodayIso();

  function notificationCountQuery() {
    let query = supabase
      .schema("hrms")
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    if (!isAdmin) query = query.eq("user_id", profile.userId);
    return query;
  }

  const [
    { count: unread },
    { count: todayCount },
    { count: criticalAlerts },
    { count: failedDeliveries },
    { count: emailQueue },
    { data: recentCritical },
  ] = await Promise.all([
    notificationCountQuery().eq("notification_status", "unread"),
    notificationCountQuery().gte("created_at", todayStart),
    notificationCountQuery().eq("priority", "critical").eq("notification_status", "unread"),
    isAdmin
      ? supabase
          .schema("hrms")
          .from("notification_deliveries")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("delivery_status", "failed")
          .is("deleted_at", null)
      : Promise.resolve({ count: 0 }),
    isAdmin
      ? supabase
          .schema("hrms")
          .from("notification_deliveries")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("channel", "email")
          .eq("delivery_status", "pending")
          .is("deleted_at", null)
      : Promise.resolve({ count: 0 }),
    (() => {
      let query = supabase
        .schema("hrms")
        .from("notifications")
        .select(
          `id, notification_type, title, message, module, priority, employee_id, user_id,
           notification_status, action_url, created_at, read_at, archived_at,
           employees:employee_id (first_name, last_name)`,
        )
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .eq("priority", "critical")
        .eq("notification_status", "unread")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!isAdmin) query = query.eq("user_id", profile.userId);
      return query;
    })(),
  ]);

  return {
    unread: unread ?? 0,
    todayCount: todayCount ?? 0,
    criticalAlerts: criticalAlerts ?? 0,
    failedDeliveries: failedDeliveries ?? 0,
    emailQueue: emailQueue ?? 0,
    recentCritical: (recentCritical ?? []).map((row) =>
      mapNotificationRow(row as NotificationRow),
    ),
  };
}

export async function getNotificationBellData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<NotificationBellData> {
  const [{ count: unreadCount }, { data }] = await Promise.all([
    supabase
      .schema("hrms")
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", profile.employee.organizationId)
      .eq("user_id", profile.userId)
      .eq("notification_status", "unread")
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("notifications")
      .select("id, title, message, module, priority, notification_status, action_url, created_at")
      .eq("organization_id", profile.employee.organizationId)
      .eq("user_id", profile.userId)
      .is("deleted_at", null)
      .neq("notification_status", "archived")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const items: NotificationBellItem[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    module: row.module as NotificationBellItem["module"],
    priority: row.priority as NotificationBellItem["priority"],
    status: row.notification_status as NotificationBellItem["status"],
    actionUrl: row.action_url,
    createdAt: row.created_at,
  }));

  return { unreadCount: unreadCount ?? 0, items };
}

export async function listNotificationTemplates(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<NotificationTemplateItem[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("notification_templates")
    .select("id, template_key, name, module, subject, body_template, variables, status, updated_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("module")
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    templateKey: row.template_key,
    name: row.name,
    module: row.module as NotificationTemplateItem["module"],
    subject: row.subject,
    bodyTemplate: row.body_template,
    variables: Array.isArray(row.variables) ? (row.variables as string[]) : [],
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export async function getNotificationSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("notification_settings")
    .select("id, type_settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const defaults = defaultTypeSettings();
  const stored = (data?.type_settings ?? {}) as Record<
    string,
    { inApp?: boolean; email?: boolean; push?: boolean; in_app?: boolean }
  >;

  const typeSettings = { ...defaults };
  for (const [key, value] of Object.entries(stored)) {
    if (key in typeSettings) {
      typeSettings[key as keyof typeof typeSettings] = {
        inApp: value.inApp ?? value.in_app ?? true,
        email: value.email ?? true,
        push: value.push ?? false,
      };
    }
  }

  return {
    id: data?.id ?? "",
    typeSettings,
  };
}

export async function getNotificationUserPreferences(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<NotificationUserPreferences> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("notification_user_preferences")
    .select("id, receive_email, receive_in_app, mute_notifications, daily_digest, weekly_digest")
    .eq("organization_id", profile.employee.organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    id: data?.id ?? null,
    receiveEmail: data?.receive_email ?? true,
    receiveInApp: data?.receive_in_app ?? true,
    muteNotifications: data?.mute_notifications ?? false,
    dailyDigest: data?.daily_digest ?? false,
    weeklyDigest: data?.weekly_digest ?? false,
  };
}
