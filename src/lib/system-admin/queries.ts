import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";

export type SystemDashboardStats = {
  totalUsers: number;
  activeEmployees: number;
  activeSessionsEstimate: number;
  storageUsageMb: number | null;
  auditEvents24h: number;
  securityAlerts24h: number;
  recentRoleChanges: Array<{
    id: string;
    description: string;
    occurredAt: string;
  }>;
  smtpConfigured: boolean;
  maintenanceMode: boolean;
  databaseHealthy: boolean;
};

export async function getSystemDashboardStats(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemDashboardStats> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    employeesResult,
    activeUsersResult,
    auditCountResult,
    securityAlertsResult,
    recentRoleChangesResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("account_status", "active")
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", since24h)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", since24h)
      .in("priority", ["high", "critical"])
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id, description, created_at")
      .eq("organization_id", organizationId)
      .in("action", ["role_changed", "role_assigned", "portal_changed"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .schema("hrms")
      .from("system_settings")
      .select("maintenance_mode, smtp_configured")
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  let storageUsageMb: number | null = null;
  try {
    const admin = createAdminClient();
    const { data: buckets } = await admin.storage.listBuckets();
    storageUsageMb = buckets?.length ?? 0;
  } catch {
    storageUsageMb = null;
  }

  return {
    totalUsers: employeesResult.count ?? 0,
    activeEmployees: activeUsersResult.count ?? 0,
    activeSessionsEstimate: activeUsersResult.count ?? 0,
    storageUsageMb,
    auditEvents24h: auditCountResult.count ?? 0,
    securityAlerts24h: securityAlertsResult.count ?? 0,
    recentRoleChanges: (recentRoleChangesResult.data ?? []).map((row) => ({
      id: row.id as string,
      description: row.description as string,
      occurredAt: row.created_at as string,
    })),
    smtpConfigured: Boolean(settingsResult.data?.smtp_configured),
    maintenanceMode: Boolean(settingsResult.data?.maintenance_mode),
    databaseHealthy: !employeesResult.error,
  };
}

export async function getDatabaseHealthSnapshot(supabase: AuthSupabaseClient) {
  const tables = [
    "employees",
    "roles",
    "permissions",
    "user_roles",
    "audit_logs",
    "employee_invitations",
  ] as const;

  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .schema("hrms")
        .from(table)
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      return { table, count: count ?? 0, healthy: !error };
    }),
  );

  return counts;
}
