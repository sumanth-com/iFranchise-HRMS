import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";

export type DatabaseIssueSeverity = "critical" | "warning" | "info";

export type DatabaseTableStatus = "healthy" | "warning" | "error";

export type DatabaseHealthIssue = {
  id: string;
  severity: DatabaseIssueSeverity;
  title: string;
  cause: string;
  suggestedFix: string;
  table?: string;
  actionLabel?: string;
  actionHref?: string;
};

export type DatabaseTableHealth = {
  table: string;
  count: number;
  healthy: boolean;
  status: DatabaseTableStatus;
  essential: boolean;
};

export type DatabaseHealthLabel = "Healthy" | "Needs Attention" | "Critical";

export type DatabaseHealthSnapshot = {
  connected: boolean;
  responseTimeMs: number;
  migrationStatus: string;
  tables: DatabaseTableHealth[];
  totalRecords: number;
  issues: DatabaseHealthIssue[];
  lastBackupAt: string | null;
  checkedAt: string;
  healthLabel: DatabaseHealthLabel;
  estimatedStorageLabel: string;
  activeConnectionsLabel: string;
  essentialTableFailures: number;
  nonEssentialTableFailures: number;
};

/** Core operational tables — multiple failures escalate overall health to Critical. */
const ESSENTIAL_TABLES = [
  "employees",
  "roles",
  "permissions",
  "user_roles",
  "departments",
] as const;

const MONITORED_TABLES = [
  "employees",
  "roles",
  "permissions",
  "user_roles",
  "departments",
  "audit_logs",
  "employee_invitations",
  "payrolls",
  "payslips",
  "leave_requests",
  "attendance",
  "assets",
] as const;

const ESSENTIAL_SET = new Set<string>(ESSENTIAL_TABLES);

/** Tables with organization_id — filter probes/counts by org for accuracy and speed. */
const TABLES_WITH_ORG_ID = new Set([
  "employees",
  "roles",
  "user_roles",
  "departments",
  "audit_logs",
  "employee_invitations",
  "payrolls",
  "attendance",
  "assets",
]);

/**
 * Large tables where exact COUNT under RLS is too expensive.
 * Accessibility is still verified with the user-scoped client; counts use service role.
 */
const HEAVY_COUNT_TABLES = new Set(["audit_logs"]);

/** Failures of this many essential tables escalate overall health to Critical. */
const ESSENTIAL_FAILURE_CRITICAL_THRESHOLD = 2;

function estimateStorageLabel(totalRecords: number): string {
  const approxKb = totalRecords * 2.5;
  if (approxKb < 1024) return `${Math.max(1, Math.round(approxKb))} KB est.`;
  if (approxKb < 1024 * 1024) return `${(approxKb / 1024).toFixed(1)} MB est.`;
  return `${(approxKb / (1024 * 1024)).toFixed(2)} GB est.`;
}

function computeHealthLabel(input: {
  connected: boolean;
  essentialFailures: number;
  hasActionableWarning: boolean;
}): DatabaseHealthLabel {
  if (!input.connected) return "Critical";
  if (input.essentialFailures >= ESSENTIAL_FAILURE_CRITICAL_THRESHOLD) return "Critical";
  if (input.essentialFailures > 0 || input.hasActionableWarning) return "Needs Attention";
  return "Healthy";
}

type ProbeClient = AuthSupabaseClient | ReturnType<typeof createAdminClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCommonFilters(query: any, table: string, organizationId: string) {
  let next = query.is("deleted_at", null);
  if (TABLES_WITH_ORG_ID.has(table)) {
    next = next.eq("organization_id", organizationId);
  }
  if (table === "audit_logs") {
    next = next.is("archived_at", null);
  }
  return next;
}

async function probeTableAccess(
  supabase: AuthSupabaseClient,
  table: string,
  organizationId: string,
): Promise<{ ok: boolean; message?: string }> {
  let query = supabase.schema("hrms").from(table).select("id").limit(1);
  query = applyCommonFilters(query, table, organizationId);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function countTableRows(
  userClient: AuthSupabaseClient,
  table: string,
  organizationId: string,
): Promise<{ count: number; error?: string }> {
  const client: ProbeClient = HEAVY_COUNT_TABLES.has(table)
    ? createAdminClient()
    : userClient;

  let query = client.schema("hrms").from(table).select("id", { count: "exact", head: true });
  query = applyCommonFilters(query, table, organizationId);
  const { count, error } = await query;
  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0 };
}

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
      id: "connection-failed",
      severity: "critical",
      title: "Database unreachable",
      cause: probe.error?.message ?? "Database connection failed",
      suggestedFix:
        "Verify Supabase URL, keys, and network connectivity. Check project status in the Supabase dashboard.",
    });
  } else if (responseTimeMs > 3000) {
    issues.push({
      id: "latency-high",
      severity: "warning",
      title: "Elevated latency",
      cause: `Database response took ${responseTimeMs}ms`,
      suggestedFix: "Review slow queries, connection pooling, and database plan capacity.",
    });
  } else if (responseTimeMs > 1500) {
    issues.push({
      id: "latency-elevated",
      severity: "info",
      title: "Latency above baseline",
      cause: `Database response is slower than usual (${responseTimeMs}ms)`,
      suggestedFix: "Monitor during peak hours. No immediate action required if this is intermittent.",
    });
  }

  const tables = await Promise.all(
    MONITORED_TABLES.map(async (table) => {
      const essential = ESSENTIAL_SET.has(table);
      if (!connected) {
        return {
          table,
          count: 0,
          healthy: false,
          status: "error" as const,
          essential,
        };
      }

      const access = await probeTableAccess(supabase, table, organizationId);
      if (!access.ok) {
        issues.push({
          id: `table-${table}`,
          severity: essential ? "warning" : "warning",
          title: essential ? "Essential table access issue" : "Table access issue",
          cause: access.message
            ? `${table} could not be queried: ${access.message}`
            : `${table} could not be queried.`,
          suggestedFix: `Check RLS policies or confirm the ${table} migration exists.`,
          table,
          actionLabel: "View details",
        });
        return {
          table,
          count: 0,
          healthy: false,
          status: "error" as const,
          essential,
        };
      }

      const counted = await countTableRows(supabase, table, organizationId);
      if (counted.error) {
        // Accessible but count failed — keep healthy, surface informational note only for heavy tables.
        if (!HEAVY_COUNT_TABLES.has(table)) {
          issues.push({
            id: `table-count-${table}`,
            severity: "info",
            title: "Row count unavailable",
            cause: `${table} is reachable but count failed: ${counted.error}`,
            suggestedFix: "Retry the health check. If this persists, review indexes and query load.",
            table,
            actionLabel: "View details",
          });
        }
        return {
          table,
          count: 0,
          healthy: true,
          status: "healthy" as const,
          essential,
        };
      }

      return {
        table,
        count: counted.count,
        healthy: true,
        status: "healthy" as const,
        essential,
      };
    }),
  );

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

  // Backup status is informational — it must not flip overall Database Health.
  if (connected && !lastBackup?.completed_at) {
    issues.push({
      id: "backup-missing",
      severity: "info",
      title: "No completed backup yet",
      cause: "No completed backup was found for this organization.",
      suggestedFix: "Optional: run a Full System Backup from Backup & Restore when convenient.",
      actionLabel: "Go to Backup & Restore",
      actionHref: "/dashboard/system/integrations?tab=backup",
    });
  }

  const essentialTableFailures = tables.filter((row) => row.essential && !row.healthy).length;
  const nonEssentialTableFailures = tables.filter((row) => !row.essential && !row.healthy).length;

  if (connected && essentialTableFailures >= ESSENTIAL_FAILURE_CRITICAL_THRESHOLD) {
    issues.unshift({
      id: "essential-tables-down",
      severity: "critical",
      title: "Multiple essential tables unavailable",
      cause: `${essentialTableFailures} essential tables failed health checks.`,
      suggestedFix:
        "Inspect Supabase schema, RLS policies, and recent migrations for core HRMS tables.",
    });
  }

  const totalRecords = tables.reduce((sum, row) => sum + row.count, 0);
  const hasActionableWarning = issues.some((issue) => issue.severity === "warning");

  const severityOrder: Record<DatabaseIssueSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    connected,
    responseTimeMs,
    migrationStatus: connected ? "Applied migrations active" : "Unknown",
    tables,
    totalRecords,
    issues,
    lastBackupAt: (lastBackup?.completed_at as string | null) ?? null,
    checkedAt: new Date().toISOString(),
    healthLabel: computeHealthLabel({
      connected,
      essentialFailures: essentialTableFailures,
      hasActionableWarning: hasActionableWarning || essentialTableFailures > 0,
    }),
    estimatedStorageLabel: estimateStorageLabel(totalRecords),
    activeConnectionsLabel: connected ? "Available" : "Unavailable",
    essentialTableFailures,
    nonEssentialTableFailures,
  };
}
