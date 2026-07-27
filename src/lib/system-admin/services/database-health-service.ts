import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

export type DatabaseHealthIssue = {
  severity: "low" | "medium" | "high" | "critical";
  cause: string;
  suggestedFix: string;
};

export type DatabaseHealthSnapshot = {
  connected: boolean;
  responseTimeMs: number;
  migrationStatus: string;
  tables: Array<{ table: string; count: number; healthy: boolean }>;
  totalRecords: number;
  issues: DatabaseHealthIssue[];
  lastBackupAt: string | null;
};

const CORE_TABLES = [
  "employees",
  "roles",
  "permissions",
  "user_roles",
  "audit_logs",
  "employee_invitations",
  "payrolls",
  "payslips",
  "leave_requests",
  "attendance",
  "assets",
  "departments",
] as const;

export async function getDatabaseHealthDetail(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<DatabaseHealthSnapshot> {
  const started = Date.now();
  const issues: DatabaseHealthIssue[] = [];

  const probe = await supabase.schema("hrms").from("organizations").select("id").limit(1);
  const responseTimeMs = Date.now() - started;
  const connected = !probe.error;

  if (!connected) {
    issues.push({
      severity: "critical",
      cause: probe.error?.message ?? "Database connection failed",
      suggestedFix: "Verify Supabase URL, keys, and network connectivity. Check project status in Supabase dashboard.",
    });
  }

  if (responseTimeMs > 2000) {
    issues.push({
      severity: "high",
      cause: `Slow database response (${responseTimeMs}ms)`,
      suggestedFix: "Review query performance, add indexes, or upgrade database plan.",
    });
  }

  const tables = await Promise.all(
    CORE_TABLES.map(async (table) => {
      const { count, error } = await supabase
        .schema("hrms")
        .from(table)
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null);
      const healthy = !error;
      if (!healthy) {
        issues.push({
          severity: "high",
          cause: `Table ${table} query failed: ${error?.message}`,
          suggestedFix: `Verify RLS policies and table existence for ${table}.`,
        });
      }
      return { table, count: count ?? 0, healthy };
    }),
  );

  const emptyCritical = tables.filter((t) => t.table === "employees" && t.count === 0);
  if (emptyCritical.length > 0) {
    issues.push({
      severity: "medium",
      cause: "No employee records found",
      suggestedFix: "Import employees or complete onboarding before production use.",
    });
  }

  const { data: lastBackup } = await supabase
    .schema("hrms")
    .from("system_backup_jobs")
    .select("completed_at")
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastBackup?.completed_at) {
    issues.push({
      severity: "medium",
      cause: "No completed backups found",
      suggestedFix: "Run a full backup from Backup & Restore immediately.",
    });
  }

  const totalRecords = tables.reduce((sum, row) => sum + row.count, 0);

  return {
    connected,
    responseTimeMs,
    migrationStatus: connected ? "Applied migrations active" : "Unknown",
    tables,
    totalRecords,
    issues,
    lastBackupAt: (lastBackup?.completed_at as string | null) ?? null,
  };
}
