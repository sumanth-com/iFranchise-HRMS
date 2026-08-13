import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { hasEmailTransport } from "@/lib/email/mailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnvironmentSnapshot } from "@/lib/system-admin/services/environment-service";
import { reconcileFakeIntegrations } from "@/lib/system-admin/services/integrations-service";

export type SystemDashboardStats = {
  totalUsers: number;
  activeEmployees: number;
  loginsToday: number;
  failedLogins24h: number;
  storageBucketCount: number;
  storageObjectEstimate: number;
  auditEvents24h: number;
  securityAlerts24h: number;
  recentRoleChanges: Array<{ id: string; description: string; occurredAt: string }>;
  recentAuditEvents: Array<{ id: string; description: string; action: string; occurredAt: string }>;
  recentErrors: Array<{ id: string; description: string; occurredAt: string }>;
  smtpConfigured: boolean;
  emailStatus: string;
  maintenanceMode: boolean;
  emergencyShutdown: boolean;
  databaseHealthy: boolean;
  databaseResponseMs: number;
  apiStatus: string;
  backupStatus: string;
  lastBackupAt: string | null;
  scheduledJobs: Array<{
    jobKey: string;
    jobName: string;
    lastStatus: string | null;
    lastRunAt: string | null;
  }>;
  systemHealth: "healthy" | "degraded" | "critical";
};

export async function getSystemDashboardStats(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemDashboardStats> {
  // Drop fake integration toggles so Recent Activity stays natural.
  await reconcileFakeIntegrations(organizationId);

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dbStarted = Date.now();
  const employeesProbe = await supabase
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);
  const databaseResponseMs = Date.now() - dbStarted;

  const [
    activeUsersResult,
    auditCountResult,
    securityAlertsResult,
    recentRoleChangesResult,
    recentAuditResult,
    recentErrorsResult,
    loginsTodayResult,
    failedLoginsResult,
    settingsResult,
    lastBackupResult,
    scheduledJobsResult,
  ] = await Promise.all([
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
      .gte("occurred_at", since24h)
      .is("deleted_at", null)
      .is("archived_at", null),
    // Real security signal: failed auth/security actions — not all high-priority audits
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("occurred_at", since24h)
      .eq("event_status", "failed")
      .in("action", ["login", "logout", "password_reset", "permission_change", "role_change"])
      .is("deleted_at", null)
      .is("archived_at", null),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id, description, occurred_at")
      .eq("organization_id", organizationId)
      .in("action", ["role_changed", "role_assigned", "portal_changed", "role_change"])
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("occurred_at", { ascending: false })
      .limit(6),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id, description, action, occurred_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("occurred_at", { ascending: false })
      .limit(10),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id, description, occurred_at")
      .eq("organization_id", organizationId)
      .eq("event_status", "failed")
      .gte("occurred_at", since24h)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("occurred_at", { ascending: false })
      .limit(8),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("action", "login")
      .gte("occurred_at", todayStart.toISOString())
      .is("deleted_at", null)
      .is("archived_at", null),
    supabase
      .schema("hrms")
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("action", "login")
      .eq("event_status", "failed")
      .gte("occurred_at", since24h)
      .is("deleted_at", null)
      .is("archived_at", null),
    supabase
      .schema("hrms")
      .from("system_settings")
      .select("maintenance_mode, smtp_configured, emergency_shutdown")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("system_backup_jobs")
      .select("completed_at, status")
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("system_scheduled_jobs")
      .select("job_key, job_name, last_status, last_run_at")
      .eq("organization_id", organizationId)
      .order("job_key"),
  ]);

  let storageBucketCount = 0;
  let storageObjectEstimate = 0;
  try {
    const admin = createAdminClient();
    const { data: buckets } = await admin.storage.listBuckets();
    storageBucketCount = buckets?.length ?? 0;
    for (const bucket of buckets ?? []) {
      const { data: objects } = await admin.storage.from(bucket.id).list("", { limit: 100 });
      storageObjectEstimate += objects?.length ?? 0;
    }
  } catch {
    storageBucketCount = 0;
  }

  const smtpConfigured = hasEmailTransport() || Boolean(settingsResult.data?.smtp_configured);
  const env = getEnvironmentSnapshot(smtpConfigured, !employeesProbe.error);
  const databaseHealthy = !employeesProbe.error;
  const securityAlerts24h = securityAlertsResult.count ?? 0;
  const failedLogins24h = failedLoginsResult.count ?? 0;
  const maintenanceMode = Boolean(settingsResult.data?.maintenance_mode);
  const emergencyShutdown = Boolean(settingsResult.data?.emergency_shutdown);
  const hasBackup = Boolean(lastBackupResult.data?.completed_at);

  // Health reflects real platform risk — not routine high-priority audit volume.
  let systemHealth: SystemDashboardStats["systemHealth"] = "healthy";
  if (!databaseHealthy || emergencyShutdown) {
    systemHealth = "critical";
  } else if (failedLogins24h > 10 || securityAlerts24h > 20 || maintenanceMode) {
    systemHealth = "degraded";
  }

  return {
    totalUsers: employeesProbe.count ?? 0,
    activeEmployees: activeUsersResult.count ?? 0,
    loginsToday: loginsTodayResult.count ?? 0,
    failedLogins24h,
    storageBucketCount,
    storageObjectEstimate,
    auditEvents24h: auditCountResult.count ?? 0,
    securityAlerts24h,
    recentRoleChanges: (recentRoleChangesResult.data ?? []).map((row) => ({
      id: row.id as string,
      description: (row.description as string) ?? "",
      occurredAt: row.occurred_at as string,
    })),
    recentAuditEvents: (recentAuditResult.data ?? []).map((row) => ({
      id: row.id as string,
      description: (row.description as string) ?? "",
      action: (row.action as string) ?? "",
      occurredAt: row.occurred_at as string,
    })),
    recentErrors: (recentErrorsResult.data ?? []).map((row) => ({
      id: row.id as string,
      description: (row.description as string) ?? "",
      occurredAt: row.occurred_at as string,
    })),
    smtpConfigured,
    emailStatus: env.emailStatus,
    maintenanceMode,
    emergencyShutdown,
    databaseHealthy,
    databaseResponseMs,
    apiStatus: databaseHealthy ? "Healthy" : "Degraded",
    backupStatus: hasBackup ? "Ready" : "No backup",
    lastBackupAt: (lastBackupResult.data?.completed_at as string | null) ?? null,
    scheduledJobs: (scheduledJobsResult.data ?? []).map((row) => ({
      jobKey: row.job_key as string,
      jobName: row.job_name as string,
      lastStatus: (row.last_status as string | null) ?? null,
      lastRunAt: (row.last_run_at as string | null) ?? null,
    })),
    systemHealth,
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
