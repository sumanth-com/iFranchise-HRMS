import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  buildQuickActions,
  CEO_NOTIFICATION_ALERT_LABELS,
  CEO_NOTIFICATION_ALERT_TYPES,
  CEO_NOTIFICATION_CATEGORIES,
  CEO_NOTIFICATION_CATEGORY_LABELS,
  isAnnouncementCategory,
  isExecutiveNotification,
  resolveAlertType,
  resolveCeoNotificationCategory,
} from "@/lib/ceo/ceo-notification-categories";
import { CEO_PENDING_APPROVAL_STATUSES } from "@/lib/ceo/executive-approvals-constants";
import {
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/reports/services/reports-utils";
import { formatNotificationModule } from "@/lib/notifications/constants";
import {
  archiveNotification,
  markNotificationRead,
} from "@/lib/notifications/services/notification-mutations";
import { ceoNotificationsListParamsSchema } from "@/lib/validations/ceo-notifications";
import type { UserProfile } from "@/types/auth";
import type {
  CeoNotificationAlertGroup,
  CeoNotificationAnnouncementItem,
  CeoNotificationCategory,
  CeoNotificationCategoryCount,
  CeoNotificationDetail,
  CeoNotificationFilterLookups,
  CeoNotificationKpis,
  CeoNotificationListItem,
  CeoNotificationListParams,
  CeoNotificationListResult,
  CeoNotificationsPageData,
} from "@/types/ceo-notifications";
import type { NotificationModule, NotificationPriority, NotificationStatus } from "@/types/notifications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const LIST_SELECT = `
  id, notification_type, title, message, module, priority, employee_id, user_id,
  notification_status, action_url, created_at, read_at, archived_at, metadata, created_by,
  employees:employee_id (
    id, first_name, last_name, department_id,
    departments:department_id (id, name)
  )
`;

function parseParams(params: CeoNotificationListParams) {
  return ceoNotificationsListParamsSchema.parse(params);
}

function mapRow(row: LooseRow): CeoNotificationListItem {
  const employee = unwrapRelation(row.employees);
  const department = employee ? unwrapRelation(employee.departments) : null;
  const type = String(row.notification_type ?? "system");
  const notificationModule = (row.module ?? "system") as NotificationModule;
  const actionUrl = row.action_url ? String(row.action_url) : null;
  const title = String(row.title ?? "");
  const message = String(row.message ?? "");
  const category = resolveCeoNotificationCategory(
    type,
    notificationModule,
    actionUrl,
    title,
    message,
  );

  return {
    id: String(row.id),
    title,
    message,
    type,
    module: notificationModule,
    category,
    categoryLabel: CEO_NOTIFICATION_CATEGORY_LABELS[category],
    priority: (row.priority ?? "medium") as NotificationPriority,
    status: (row.notification_status ?? "unread") as NotificationStatus,
    departmentId: department?.id ? String(department.id) : employee?.department_id ?? null,
    departmentName: department?.name ? String(department.name) : null,
    employeeId: row.employee_id ? String(row.employee_id) : null,
    employeeName: employee
      ? formatEmployeeName(employee.first_name, employee.last_name)
      : null,
    generatedByName: null,
    actionUrl,
    createdAt: String(row.created_at),
    readAt: row.read_at ? String(row.read_at) : null,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

function matchesExecutive(item: CeoNotificationListItem) {
  return isExecutiveNotification({
    type: item.type,
    module: item.module,
    priority: item.priority,
    actionUrl: item.actionUrl,
    title: item.title,
    message: item.message,
  });
}

function matchesFilters(
  item: CeoNotificationListItem,
  params: ReturnType<typeof parseParams>,
) {
  if (!matchesExecutive(item)) return false;
  if (params.category && item.category !== params.category) return false;
  if (params.priority && item.priority !== params.priority) return false;
  if (params.status) {
    if (item.status !== params.status) return false;
  } else if (item.status === "archived") {
    return false;
  }
  if (params.departmentId && item.departmentId !== params.departmentId) return false;
  if (params.dateFrom && item.createdAt < params.dateFrom) return false;
  if (params.dateTo) {
    const end = params.dateTo.includes("T")
      ? params.dateTo
      : `${params.dateTo}T23:59:59.999Z`;
    if (item.createdAt > end) return false;
  }
  if (params.search?.trim()) {
    const term = params.search.trim().toLowerCase();
    const haystack = [
      item.title,
      item.message,
      item.categoryLabel,
      item.departmentName ?? "",
      item.employeeName ?? "",
      item.type,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  return true;
}

async function loadCeoNotificationRows(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoNotificationListItem[]> {
  const { data, error } = await fromHrms(supabase, "notifications")
    .select(LIST_SELECT)
    .eq("organization_id", profile.employee.organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return ((data ?? []) as LooseRow[]).map(mapRow).filter(matchesExecutive);
}

async function resolveGeneratedByNames(
  supabase: AuthSupabaseClient,
  organizationId: string,
  rows: LooseRow[],
): Promise<Map<string, string>> {
  const userIds = Array.from(
    new Set(
      rows
        .map((row) => (row.created_by ? String(row.created_by) : null))
        .filter(Boolean) as string[],
    ),
  );
  if (userIds.length === 0) return new Map();

  const { data, error } = await fromHrms(supabase, "user_roles")
    .select("user_id, employees:employee_id(first_name, last_name)")
    .eq("organization_id", organizationId)
    .in("user_id", userIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const row of (data ?? []) as LooseRow[]) {
    const employee = unwrapRelation(row.employees);
    if (!employee || !row.user_id) continue;
    map.set(
      String(row.user_id),
      formatEmployeeName(employee.first_name, employee.last_name),
    );
  }
  return map;
}

export async function getCeoNotificationsFilterLookups(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<CeoNotificationFilterLookups> {
  const { data, error } = await fromHrms(supabase, "departments")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);

  return {
    departments: ((data ?? []) as LooseRow[]).map((row) => ({
      id: String(row.id),
      label: String(row.name),
    })),
  };
}

export async function getCeoNotificationsKpis(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  items: CeoNotificationListItem[],
): Promise<CeoNotificationKpis> {
  const active = items.filter((item) => item.status !== "archived");
  const unread = active.filter((item) => item.status === "unread");

  const { count: pendingApprovals, error } = await fromHrms(
    supabase,
    "executive_approval_requests",
  )
    .select("id", { count: "exact", head: true })
    .eq("organization_id", profile.employee.organizationId)
    .in("request_status", [...CEO_PENDING_APPROVAL_STATUSES])
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  return {
    totalNotifications: active.length,
    unread: unread.length,
    highPriority: active.filter(
      (item) => item.priority === "high" || item.priority === "critical",
    ).length,
    pendingApprovals: pendingApprovals ?? 0,
    systemAlerts: active.filter(
      (item) =>
        item.category === "system" ||
        item.category === "security" ||
        item.priority === "critical",
    ).length,
    companyAnnouncements: active.filter((item) => isAnnouncementCategory(item.category))
      .length,
    recruitmentAlerts: active.filter((item) => item.category === "recruitment").length,
    payrollAlerts: active.filter((item) => item.category === "payroll").length,
  };
}

export async function getCeoNotificationsCategories(
  items: CeoNotificationListItem[],
): Promise<CeoNotificationCategoryCount[]> {
  const active = items.filter((item) => item.status !== "archived");
  return CEO_NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    label: CEO_NOTIFICATION_CATEGORY_LABELS[category],
    count: active.filter((item) => item.category === category).length,
  }));
}

export function listCeoNotifications(
  items: CeoNotificationListItem[],
  params: CeoNotificationListParams,
): CeoNotificationListResult {
  const parsed = parseParams(params);
  const filtered = items.filter((item) => matchesFilters(item, parsed));
  const from = (parsed.page - 1) * parsed.pageSize;
  const data = filtered.slice(from, from + parsed.pageSize);

  return {
    data,
    total: filtered.length,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export function getCeoNotificationAlerts(
  items: CeoNotificationListItem[],
): CeoNotificationAlertGroup[] {
  const active = items.filter(
    (item) =>
      item.status !== "archived" &&
      (item.priority === "high" ||
        item.priority === "critical" ||
        item.category === "executive_approvals" ||
        item.category === "security"),
  );

  return CEO_NOTIFICATION_ALERT_TYPES.map((alertType) => {
    const matched = active.filter((item) => resolveAlertType(item) === alertType);
    return {
      alertType,
      label: CEO_NOTIFICATION_ALERT_LABELS[alertType],
      count: matched.length,
      items: matched.slice(0, 5),
    };
  }).filter((group) => group.count > 0);
}

export function getCeoNotificationAnnouncements(
  items: CeoNotificationListItem[],
): CeoNotificationAnnouncementItem[] {
  return items
    .filter((item) => item.status !== "archived" && isAnnouncementCategory(item.category))
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      category: item.category,
      categoryLabel: item.categoryLabel,
      createdAt: item.createdAt,
      priority: item.priority,
      status: item.status,
    }));
}

export async function getCeoNotificationDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  notificationId: string,
): Promise<CeoNotificationDetail | null> {
  const { data, error } = await fromHrms(supabase, "notifications")
    .select(LIST_SELECT)
    .eq("id", notificationId)
    .eq("organization_id", profile.employee.organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as LooseRow;
  const item = mapRow(row);
  if (!matchesExecutive(item)) return null;

  const generatedBy = await resolveGeneratedByNames(
    supabase,
    profile.employee.organizationId,
    [row],
  );
  if (row.created_by) {
    item.generatedByName = generatedBy.get(String(row.created_by)) ?? "System";
  } else {
    item.generatedByName = "System";
  }

  const timeline: CeoNotificationDetail["timeline"] = [
    {
      id: "created",
      label: "Notification created",
      at: item.createdAt,
      detail: item.generatedByName ?? undefined,
    },
  ];
  if (item.readAt) {
    timeline.push({
      id: "read",
      label: "Marked read",
      at: item.readAt,
    });
  }
  if (item.archivedAt) {
    timeline.push({
      id: "archived",
      label: "Archived",
      at: item.archivedAt,
    });
  }

  const supportingInfo: { label: string; value: string }[] = [
    { label: "Notification Type", value: item.type },
    { label: "Module", value: formatNotificationModule(item.module) },
    { label: "Category", value: item.categoryLabel },
  ];

  for (const [key, value] of Object.entries(item.metadata)) {
    if (value == null) continue;
    if (typeof value === "object") {
      supportingInfo.push({ label: key, value: JSON.stringify(value) });
    } else {
      supportingInfo.push({ label: key, value: String(value) });
    }
  }

  return {
    item,
    relatedModuleLabel: formatNotificationModule(item.module),
    timeline,
    supportingInfo,
    quickActions: buildQuickActions(item),
  };
}

export async function getCeoNotificationsPageData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoNotificationListParams,
): Promise<CeoNotificationsPageData> {
  const parsed = parseParams(params);
  const { data: rawRows, error } = await fromHrms(supabase, "notifications")
    .select(LIST_SELECT)
    .eq("organization_id", profile.employee.organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const rows = (rawRows ?? []) as LooseRow[];
  const generatedBy = await resolveGeneratedByNames(
    supabase,
    profile.employee.organizationId,
    rows,
  );

  const items = rows.map((row) => {
    const item = mapRow(row);
    if (row.created_by) {
      item.generatedByName = generatedBy.get(String(row.created_by)) ?? "System";
    } else {
      item.generatedByName = "System";
    }
    return item;
  }).filter(matchesExecutive);

  const [kpis, lookups] = await Promise.all([
    getCeoNotificationsKpis(supabase, profile, items),
    getCeoNotificationsFilterLookups(supabase, profile.employee.organizationId),
  ]);

  return {
    kpis,
    categories: await getCeoNotificationsCategories(items),
    list: listCeoNotifications(items, parsed),
    alerts: getCeoNotificationAlerts(items),
    announcements: getCeoNotificationAnnouncements(items),
    lookups,
  };
}

export async function markCeoNotificationRead(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  notificationId: string,
) {
  await markNotificationRead(supabase, profile, notificationId);
}

export async function archiveCeoNotification(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  notificationId: string,
) {
  await archiveNotification(supabase, profile, notificationId);
}

export async function completeCeoNotificationAfterNavigate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  notificationId: string,
) {
  const detail = await getCeoNotificationDetail(supabase, profile, notificationId);
  if (!detail) throw new Error("Notification not found");

  if (detail.item.status === "unread") {
    await markNotificationRead(supabase, profile, notificationId);
  }

  const nextMetadata = {
    ...detail.item.metadata,
    completed_at: new Date().toISOString(),
    completed_via: "ceo_navigate",
  };

  const { error } = await fromHrms(supabase, "notifications")
    .update({
      metadata: nextMetadata,
      updated_by: profile.userId,
    })
    .eq("id", notificationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

/** Prefetch helper kept for optional reuse. */
export async function prefetchCeoNotifications(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  return loadCeoNotificationRows(supabase, profile);
}

export type { CeoNotificationCategory };
