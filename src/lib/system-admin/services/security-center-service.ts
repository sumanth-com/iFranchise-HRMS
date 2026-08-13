import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { AuditListItem } from "@/types/audit";
import type { UserProfile } from "@/types/auth";

export type SecuritySuspendedAccount = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  accountStatus: string;
  lastLoginAt: string | null;
};

export type SecurityCenterData = {
  failedLogins24h: number;
  loginEvents24h: number;
  securityEvents24h: number;
  suspendedAccounts: SecuritySuspendedAccount[];
  recentFailedLogins: AuditListItem[];
  recentSecurityEvents: AuditListItem[];
  recentLogins: AuditListItem[];
};

function mapAuditLite(
  row: {
    id: string;
    occurred_at: string;
    user_id: string | null;
    table_name: string;
    record_id: string;
    module: string;
    action: string;
    description: string | null;
    ip_address: string | null;
    device_type: string | null;
    browser: string | null;
    event_status: string;
    priority: string;
  },
  userMap: Map<string, { name: string; email: string | null; roleName: string | null }>,
): AuditListItem {
  const user = row.user_id ? userMap.get(row.user_id) : null;
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    userId: row.user_id,
    userName: user?.name ?? null,
    userEmail: user?.email ?? null,
    roleName: user?.roleName ?? null,
    module: row.module,
    action: row.action,
    recordId: row.record_id,
    tableName: row.table_name,
    description: row.description,
    ipAddress: row.ip_address,
    deviceType: row.device_type,
    browser: row.browser,
    eventStatus: row.event_status === "failed" ? "failed" : "success",
    priority:
      row.priority === "critical" ||
      row.priority === "high" ||
      row.priority === "medium" ||
      row.priority === "low"
        ? row.priority
        : "medium",
  };
}

async function loadUserMap(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userIds: string[],
) {
  const map = new Map<string, { name: string; email: string | null; roleName: string | null }>();
  if (userIds.length === 0) return map;

  const { data } = await supabase
    .schema("hrms")
    .from("employees")
    .select("user_id, first_name, last_name, email")
    .eq("organization_id", organizationId)
    .in("user_id", userIds)
    .is("deleted_at", null);

  for (const row of data ?? []) {
    if (!row.user_id) continue;
    map.set(row.user_id, {
      name: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      roleName: null,
    });
  }
  return map;
}

export async function getSecurityCenterData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<SecurityCenterData> {
  const organizationId = profile.employee.organizationId;
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const sinceIso = since.toISOString();

  const auditSelect =
    "id, occurred_at, user_id, table_name, record_id, module, action, description, ip_address, device_type, browser, event_status, priority";

  const [
    failedCountResult,
    loginCountResult,
    securityCountResult,
    failedRowsResult,
    loginRowsResult,
    securityRowsResult,
    suspendedResult,
  ] = await Promise.all([
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("action", "login")
      .eq("event_status", "failed")
      .gte("occurred_at", sinceIso)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("action", "login")
      .gte("occurred_at", sinceIso)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("priority", ["high", "critical"])
      .gte("occurred_at", sinceIso)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select(auditSelect)
      .eq("organization_id", organizationId)
      .eq("action", "login")
      .eq("event_status", "failed")
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(12),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select(auditSelect)
      .eq("organization_id", organizationId)
      .eq("action", "login")
      .eq("event_status", "success")
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(12),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select(auditSelect)
      .eq("organization_id", organizationId)
      .in("action", ["login", "logout", "password_reset", "role_change", "permission_change"])
      .in("priority", ["high", "critical"])
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .limit(12),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, employee_code, first_name, last_name, email, account_status, last_login_at")
      .eq("organization_id", organizationId)
      .eq("account_status", "suspended")
      .is("deleted_at", null)
      .order("last_login_at", { ascending: false })
      .limit(25),
  ]);

  const allRows = [
    ...(failedRowsResult.data ?? []),
    ...(loginRowsResult.data ?? []),
    ...(securityRowsResult.data ?? []),
  ];
  const userIds = [
    ...new Set(allRows.map((row) => row.user_id).filter(Boolean)),
  ] as string[];
  const userMap = await loadUserMap(supabase, organizationId, userIds);

  return {
    failedLogins24h: failedCountResult.count ?? 0,
    loginEvents24h: loginCountResult.count ?? 0,
    securityEvents24h: securityCountResult.count ?? 0,
    suspendedAccounts: (suspendedResult.data ?? []).map((row) => ({
      id: String(row.id),
      employeeCode: String(row.employee_code),
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      email: String(row.email),
      accountStatus: String(row.account_status),
      lastLoginAt: (row.last_login_at as string | null) ?? null,
    })),
    recentFailedLogins: (failedRowsResult.data ?? []).map((row) =>
      mapAuditLite(
        row as Parameters<typeof mapAuditLite>[0],
        userMap,
      ),
    ),
    recentLogins: (loginRowsResult.data ?? []).map((row) =>
      mapAuditLite(
        row as Parameters<typeof mapAuditLite>[0],
        userMap,
      ),
    ),
    recentSecurityEvents: (securityRowsResult.data ?? []).map((row) =>
      mapAuditLite(
        row as Parameters<typeof mapAuditLite>[0],
        userMap,
      ),
    ),
  };
}
