import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { getAuditModuleScope } from "@/lib/audit/constants";
import { auditListParamsSchema, type AuditListParams } from "@/lib/validations/audit";
import type {
  AuditDashboardStats,
  AuditDetail,
  AuditListItem,
  AuditListResult,
  AuditSettings,
} from "@/types/audit";

type AuditRow = {
  id: string;
  occurred_at: string;
  user_id: string | null;
  table_name: string;
  record_id: string;
  module: string | null;
  action: string | null;
  description: string | null;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  user_agent: string | null;
  event_status: string;
  priority: string;
  reason: string | null;
  old_record: Record<string, unknown> | null;
  new_record: Record<string, unknown> | null;
  operation: string;
};

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function mapAuditRow(
  row: AuditRow,
  userMap: Map<string, { name: string; email: string; roleName: string | null }>,
): AuditListItem {
  const user = row.user_id ? userMap.get(row.user_id) : undefined;
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    userId: row.user_id,
    userName: user?.name ?? null,
    userEmail: user?.email ?? null,
    roleName: user?.roleName ?? null,
    module: row.module ?? "settings",
    action: row.action ?? row.operation.toLowerCase(),
    recordId: row.record_id,
    tableName: row.table_name,
    description: row.description,
    ipAddress: row.ip_address,
    deviceType: row.device_type,
    browser: row.browser,
    eventStatus: row.event_status as AuditListItem["eventStatus"],
    priority: row.priority as AuditListItem["priority"],
  };
}

async function loadUserMap(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userIds: string[],
) {
  const map = new Map<string, { name: string; email: string; roleName: string | null }>();
  if (userIds.length === 0) return map;

  const { data: userRoles } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select(
      `user_id, employees:employee_id (first_name, last_name, email), roles:role_id (name)`,
    )
    .eq("organization_id", organizationId)
    .in("user_id", userIds)
    .is("deleted_at", null);

  for (const row of userRoles ?? []) {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    if (!row.user_id || !employee) continue;
    map.set(row.user_id, {
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      email: employee.email ?? "",
      roleName: role?.name ?? null,
    });
  }

  return map;
}

export async function listAuditLogs(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: AuditListParams,
): Promise<AuditListResult> {
  const parsed = auditListParamsSchema.parse(params);
  const organizationId = profile.employee.organizationId;
  const from = (parsed.page - 1) * parsed.pageSize;
  const to = from + parsed.pageSize - 1;

  const scope = getAuditModuleScope(profile);

  let query = supabase
    .schema("hrms")
    .from("audit_logs")
    .select(
      `id, occurred_at, user_id, table_name, record_id, module, action, description,
       ip_address, device_type, browser, operating_system, user_agent, event_status, priority,
       reason, old_record, new_record, operation`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("occurred_at", { ascending: false });

  if (scope && scope.length > 0) query = query.in("module", scope);
  else if (scope && scope.length === 0) {
    query = query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  if (parsed.userId) query = query.eq("user_id", parsed.userId);
  if (parsed.module) query = query.eq("module", parsed.module);
  if (parsed.action) query = query.eq("action", parsed.action);
  if (parsed.status) query = query.eq("event_status", parsed.status);
  if (parsed.priority) query = query.eq("priority", parsed.priority);
  if (parsed.dateFrom) query = query.gte("occurred_at", parsed.dateFrom);
  if (parsed.dateTo) query = query.lte("occurred_at", `${parsed.dateTo}T23:59:59.999Z`);
  if (parsed.search?.trim()) {
    const term = `%${parsed.search.trim()}%`;
    query = query.or(
      `description.ilike.${term},record_id.ilike.${term},table_name.ilike.${term},action.ilike.${term}`,
    );
  }

  if (parsed.roleId) {
    const { data: roleUsers } = await supabase
      .schema("hrms")
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role_id", parsed.roleId)
      .is("deleted_at", null);
    const ids = (roleUsers ?? []).map((r) => r.user_id).filter(Boolean) as string[];
    if (ids.length === 0) {
      return { items: [], total: 0, page: parsed.page, pageSize: parsed.pageSize };
    }
    query = query.in("user_id", ids);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const userIds = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  const userMap = await loadUserMap(supabase, organizationId, userIds);

  return {
    items: (data ?? []).map((row) => mapAuditRow(row as AuditRow, userMap)),
    total: count ?? 0,
    page: parsed.page,
    pageSize: parsed.pageSize,
  };
}

export async function getAuditLogDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
): Promise<AuditDetail | null> {
  const organizationId = profile.employee.organizationId;
  const scope = getAuditModuleScope(profile);

  let query = supabase
    .schema("hrms")
    .from("audit_logs")
    .select(
      `id, occurred_at, user_id, table_name, record_id, module, action, description,
       ip_address, device_type, browser, operating_system, user_agent, event_status, priority,
       reason, old_record, new_record, operation`,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .eq("id", id);

  if (scope && scope.length > 0) query = query.in("module", scope);
  else if (scope && scope.length === 0) {
    query = query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const userMap = await loadUserMap(
    supabase,
    organizationId,
    data.user_id ? [data.user_id] : [],
  );
  const base = mapAuditRow(data as AuditRow, userMap);

  return {
    ...base,
    operatingSystem: data.operating_system,
    userAgent: data.user_agent,
    reason: data.reason,
    oldRecord: (data.old_record as Record<string, unknown> | null) ?? null,
    newRecord: (data.new_record as Record<string, unknown> | null) ?? null,
    operation: data.operation,
  };
}

export async function getAuditDashboardStats(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<AuditDashboardStats> {
  const organizationId = profile.employee.organizationId;
  const todayStart = startOfTodayIso();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const scope = getAuditModuleScope(profile);

  const base = () => {
    let q = supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null);
    if (scope && scope.length > 0) q = q.in("module", scope);
    else if (scope && scope.length === 0) {
      q = q.eq("id", "00000000-0000-0000-0000-000000000000");
    }
    return q;
  };

  const scopedSelect = <T extends string>(select: T) => {
    let q = supabase
      .schema("hrms")
      .from("audit_logs")
      .select(select)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null);
    if (scope && scope.length > 0) q = q.in("module", scope);
    else if (scope && scope.length === 0) {
      q = q.eq("id", "00000000-0000-0000-0000-000000000000");
    }
    return q;
  };

  const [
    { count: totalToday },
    { count: criticalActions },
    { count: failedActions },
    { count: loginEvents },
    { data: recentRows },
    { data: moduleRows },
    { data: timelineRows },
    { data: userRows },
  ] = await Promise.all([
    base().gte("occurred_at", todayStart),
    base().eq("priority", "critical").gte("occurred_at", todayStart),
    base().eq("event_status", "failed").gte("occurred_at", todayStart),
    base().eq("action", "login").gte("occurred_at", todayStart),
    scopedSelect(
      `id, occurred_at, user_id, table_name, record_id, module, action, description,
       ip_address, device_type, browser, event_status, priority, operation`,
    )
      .order("occurred_at", { ascending: false })
      .limit(8),
    scopedSelect("module").gte("occurred_at", sevenDaysAgo.toISOString()),
    scopedSelect("occurred_at").gte("occurred_at", sevenDaysAgo.toISOString()),
    scopedSelect("user_id")
      .gte("occurred_at", todayStart)
      .not("user_id", "is", null),
  ]);

  const userIds = [
    ...new Set([
      ...(recentRows ?? []).map((r) => r.user_id).filter(Boolean),
      ...(userRows ?? []).map((r) => r.user_id).filter(Boolean),
    ]),
  ] as string[];
  const userMap = await loadUserMap(supabase, organizationId, userIds);

  const moduleCounts = new Map<string, number>();
  for (const row of moduleRows ?? []) {
    const mod = row.module ?? "settings";
    moduleCounts.set(mod, (moduleCounts.get(mod) ?? 0) + 1);
  }

  const dayCounts = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    dayCounts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of timelineRows ?? []) {
    const key = row.occurred_at.slice(0, 10);
    if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const userCounts = new Map<string, number>();
  for (const row of userRows ?? []) {
    if (!row.user_id) continue;
    userCounts.set(row.user_id, (userCounts.get(row.user_id) ?? 0) + 1);
  }

  const topActiveUsers = [...userCounts.entries()]
    .map(([userId, count]) => ({
      userId,
      userName: userMap.get(userId)?.name ?? "Unknown",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalToday: totalToday ?? 0,
    criticalActions: criticalActions ?? 0,
    failedActions: failedActions ?? 0,
    loginEvents: loginEvents ?? 0,
    recentChanges: (recentRows ?? []).map((row) =>
      mapAuditRow(row as AuditRow, userMap),
    ),
    topActiveUsers,
    activityByModule: [...moduleCounts.entries()]
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count),
    activityTimeline: [...dayCounts.entries()].map(([date, count]) => ({ date, count })),
    activityByUser: topActiveUsers,
  };
}

export async function getAuditSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<AuditSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("audit_settings")
    .select("id, retention_days")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    id: data?.id ?? "",
    retentionDays: data?.retention_days ?? 365,
  };
}

export async function listAuditRoles(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, label: r.name }));
}

export async function listAuditUsers(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select(`user_id, employees:employee_id (first_name, last_name)`)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => row.user_id)
    .map((row) => {
      const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
      return {
        id: row.user_id as string,
        label: employee
          ? `${employee.first_name} ${employee.last_name}`.trim()
          : row.user_id as string,
      };
    });
}
