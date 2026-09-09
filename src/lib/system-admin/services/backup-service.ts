import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";
import {
  BACKUP_SCOPE_OPTIONS,
  BACKUP_TYPES,
  toFriendlyBackupError,
  type BackupJobRow,
  type BackupOperationsSnapshot,
  type BackupScheduleFrequency,
  type BackupType,
} from "@/lib/system-admin/services/backup-types";

export {
  BACKUP_SCOPE_OPTIONS,
  BACKUP_TYPES,
  type BackupJobRow,
  type BackupOperationsSnapshot,
  type BackupScheduleFrequency,
  type BackupType,
};

const TYPE_TABLE_MAP: Record<string, string[]> = {
  employees: ["employees"],
  payroll: ["payrolls", "payslips", "salary_structures"],
  attendance: ["attendance"],
  leave: ["leave_types", "leave_requests", "leave_balances"],
  performance: ["performance_reviews"],
  recruitment: ["recruitment_candidates"],
  documents: ["employee_documents"],
  assets: ["assets"],
  organization: ["departments", "designations", "branches", "holidays"],
  settings: ["system_settings", "organization_settings"],
  permissions: ["roles", "permissions", "role_permissions", "user_roles"],
  // Separate scope — excluded from full to avoid multi‑minute / OOM exports.
  audit_logs: ["audit_logs"],
  database: [
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "system_settings",
    "organization_settings",
    "departments",
    "designations",
    "branches",
  ],
};

/** Tables included in Full System Backup (audit trail exported separately). */
const FULL_BACKUP_TABLES = [
  ...TYPE_TABLE_MAP.employees,
  ...TYPE_TABLE_MAP.payroll,
  ...TYPE_TABLE_MAP.attendance,
  ...TYPE_TABLE_MAP.leave,
  ...TYPE_TABLE_MAP.performance,
  ...TYPE_TABLE_MAP.recruitment,
  ...TYPE_TABLE_MAP.documents,
  ...TYPE_TABLE_MAP.assets,
  ...TYPE_TABLE_MAP.organization,
  ...TYPE_TABLE_MAP.settings,
  ...TYPE_TABLE_MAP.permissions,
];

/** Must succeed for the backup type to complete. */
const ESSENTIAL_TABLES: Record<string, string[]> = {
  full: ["employees"],
  employees: ["employees"],
  payroll: ["payrolls"],
  documents: ["employee_documents"],
  database: ["roles"],
  attendance: ["attendance"],
  leave: ["leave_types"],
  performance: ["performance_reviews"],
  recruitment: ["recruitment_candidates"],
  assets: ["assets"],
  organization: ["departments"],
  settings: ["organization_settings"],
  permissions: ["roles"],
  audit_logs: ["audit_logs"],
};

const FREQUENCY_CRON: Record<BackupScheduleFrequency, string> = {
  hourly: "0 * * * *",
  daily: "0 2 * * *",
  weekly: "0 3 * * 0",
};

const FREQUENCY_LABEL: Record<BackupScheduleFrequency, string> = {
  hourly: "Every hour",
  daily: "Daily at 02:00 UTC",
  weekly: "Weekly on Sunday 03:00 UTC",
};

const PAGE_SIZE = 1000;

type AdminClient = ReturnType<typeof createAdminClient>;

type TableSchema = {
  exists: boolean;
  hasOrganizationId: boolean;
  hasEmployeeId: boolean;
  hasRoleId: boolean;
  hasDeletedAt: boolean;
  hasArchivedAt: boolean;
};

type SchemaCache = Map<string, TableSchema>;

function normalizeFrequency(value: unknown): BackupScheduleFrequency {
  if (value === "hourly" || value === "weekly" || value === "daily") return value;
  return "daily";
}

function computeNextRunAt(frequency: BackupScheduleFrequency, from = new Date()): Date {
  const next = new Date(from);
  next.setSeconds(0, 0);
  if (frequency === "hourly") {
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next;
  }
  if (frequency === "weekly") {
    next.setHours(3, 0, 0, 0);
    const day = next.getUTCDay();
    const add = day === 0 ? 7 : 7 - day;
    next.setUTCDate(next.getUTCDate() + add);
    if (next <= from) next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  next.setUTCHours(2, 0, 0, 0);
  if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function tablesForBackupType(backupType: BackupType): string[] {
  if (backupType === "full") return [...new Set(FULL_BACKUP_TABLES)];
  return TYPE_TABLE_MAP[backupType] ?? [];
}

function isEssentialTable(backupType: BackupType, table: string): boolean {
  return (ESSENTIAL_TABLES[backupType] ?? []).includes(table);
}

function logBackupTechnical(context: string, detail: string) {
  console.error(`[backup] ${context}: ${detail}`);
}

function looksTechnical(message: string): boolean {
  return (
    /does not exist|column |relation |permission denied|postgres|pgrst|mime type|sqlstate|ECONN|row-level|schema cache|could not find/i.test(
      message,
    ) || /^[a-z_]+:\s/i.test(message.trim())
  );
}

function mapJobRow(row: Record<string, unknown>): BackupJobRow {
  const rawError = (row.error_message as string | null) ?? null;
  const technicalDetails =
    rawError && looksTechnical(rawError)
      ? rawError
      : rawError && !rawError.startsWith("Backup could not") && !rawError.startsWith("The backup could not")
        ? rawError
        : null;

  return {
    id: row.id as string,
    backupType: row.backup_type as string,
    format: row.format as string,
    status: row.status as string,
    storagePath: (row.storage_path as string | null) ?? null,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
    durationMs: row.duration_ms ? Number(row.duration_ms) : null,
    recordCount: row.record_count != null ? Number(row.record_count) : null,
    errorMessage: rawError ? toFriendlyBackupError(rawError) : null,
    technicalDetails,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

async function columnExists(admin: AdminClient, table: string, column: string): Promise<boolean> {
  const { error } = await admin.schema("hrms").from(table).select(column).limit(0);
  if (!error) return true;
  const message = error.message.toLowerCase();
  if (
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache") ||
    error.code === "42703"
  ) {
    return false;
  }
  // Unexpected errors — treat as missing to avoid hard-crashing on probes.
  logBackupTechnical(`column-probe ${table}.${column}`, error.message);
  return false;
}

async function resolveTableSchema(
  admin: AdminClient,
  table: string,
  cache: SchemaCache,
): Promise<TableSchema> {
  const cached = cache.get(table);
  if (cached) return cached;

  const { data, error: tableError } = await admin.schema("hrms").from(table).select("*").limit(1);
  if (tableError) {
    const message = tableError.message.toLowerCase();
    if (
      message.includes("does not exist") ||
      message.includes("could not find the table") ||
      message.includes("schema cache")
    ) {
      const missing: TableSchema = {
        exists: false,
        hasOrganizationId: false,
        hasEmployeeId: false,
        hasRoleId: false,
        hasDeletedAt: false,
        hasArchivedAt: false,
      };
      cache.set(table, missing);
      return missing;
    }
  }

  const sample = data?.[0] as Record<string, unknown> | undefined;
  if (sample) {
    const keys = new Set(Object.keys(sample));
    const schema: TableSchema = {
      exists: true,
      hasOrganizationId: keys.has("organization_id"),
      hasEmployeeId: keys.has("employee_id"),
      hasRoleId: keys.has("role_id"),
      hasDeletedAt: keys.has("deleted_at"),
      hasArchivedAt: keys.has("archived_at"),
    };
    cache.set(table, schema);
    return schema;
  }

  // Empty table — probe columns individually.
  const [hasOrganizationId, hasEmployeeId, hasRoleId, hasDeletedAt, hasArchivedAt] =
    await Promise.all([
      columnExists(admin, table, "organization_id"),
      columnExists(admin, table, "employee_id"),
      columnExists(admin, table, "role_id"),
      columnExists(admin, table, "deleted_at"),
      columnExists(admin, table, "archived_at"),
    ]);

  const schema: TableSchema = {
    exists: true,
    hasOrganizationId,
    hasEmployeeId,
    hasRoleId,
    hasDeletedAt,
    hasArchivedAt,
  };
  cache.set(table, schema);
  return schema;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySoftDelete(query: any, schema: TableSchema): any {
  if (!schema.hasDeletedAt) return query;
  return query.is("deleted_at", null);
}

async function listOrganizationEmployeeIds(
  admin: AdminClient,
  organizationId: string,
): Promise<string[]> {
  const ids: string[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await admin
      .schema("hrms")
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`employees: ${error.message}`);
    const batch = data ?? [];
    ids.push(...batch.map((row: { id: string }) => row.id));
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return ids;
}

async function listOrganizationRoleIds(
  admin: AdminClient,
  organizationId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .schema("hrms")
    .from("roles")
    .select("id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);
  if (error) throw new Error(`roles: ${error.message}`);
  return (data ?? []).map((row: { id: string }) => row.id);
}

async function fetchPaged(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildQuery: (from: number, to: number) => any,
  table: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchTableData(
  admin: AdminClient,
  organizationId: string,
  table: string,
  cache: SchemaCache,
  employeeIdsCache: { value: string[] | null },
  roleIdsCache: { value: string[] | null },
): Promise<Record<string, unknown>[]> {
  const schema = await resolveTableSchema(admin, table, cache);
  if (!schema.exists) {
    throw new Error(`${table}: table is not available in this database`);
  }

  if (table === "organizations") {
    return fetchPaged(
      (from, to) =>
        applySoftDelete(
          admin.schema("hrms").from(table).select("*").eq("id", organizationId),
          schema,
        ).range(from, to),
      table,
    );
  }

  // Prefer the safest filter that matches real columns — never assume organization_id.
  if (schema.hasOrganizationId) {
    return fetchPaged((from, to) => {
      let query = applySoftDelete(
        admin.schema("hrms").from(table).select("*").eq("organization_id", organizationId),
        schema,
      );
      if (table === "audit_logs" && schema.hasArchivedAt) {
        query = query.is("archived_at", null).order("occurred_at", { ascending: false });
      }
      return query.range(from, to);
    }, table);
  }

  if (schema.hasEmployeeId) {
    if (!employeeIdsCache.value) {
      employeeIdsCache.value = await listOrganizationEmployeeIds(admin, organizationId);
    }
    const employeeIds = employeeIdsCache.value;
    if (employeeIds.length === 0) return [];

    const rows: Record<string, unknown>[] = [];
    const chunkSize = 150;
    for (let index = 0; index < employeeIds.length; index += chunkSize) {
      const chunk = employeeIds.slice(index, index + chunkSize);
      const chunkRows = await fetchPaged(
        (from, to) =>
          applySoftDelete(
            admin.schema("hrms").from(table).select("*").in("employee_id", chunk),
            schema,
          ).range(from, to),
        table,
      );
      rows.push(...chunkRows);
    }
    return rows;
  }

  if (schema.hasRoleId) {
    if (!roleIdsCache.value) {
      roleIdsCache.value = await listOrganizationRoleIds(admin, organizationId);
    }
    const roleIds = roleIdsCache.value;
    if (roleIds.length === 0) return [];

    const rows: Record<string, unknown>[] = [];
    const chunkSize = 150;
    for (let index = 0; index < roleIds.length; index += chunkSize) {
      const chunk = roleIds.slice(index, index + chunkSize);
      const chunkRows = await fetchPaged(
        (from, to) =>
          applySoftDelete(
            admin.schema("hrms").from(table).select("*").in("role_id", chunk),
            schema,
          ).range(from, to),
        table,
      );
      rows.push(...chunkRows);
    }
    return rows;
  }

  // Global catalog tables (e.g. permissions) — no org/employee/role scope.
  return fetchPaged(
    (from, to) =>
      applySoftDelete(admin.schema("hrms").from(table).select("*"), schema).range(from, to),
    table,
  );
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = row[key];
          const text =
            value === null || value === undefined
              ? ""
              : typeof value === "object"
                ? JSON.stringify(value)
                : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

function contentTypeForFormat(format: "json" | "csv"): string {
  return format === "json" ? "application/json" : "text/csv";
}

async function validateBackupPrerequisites(admin: AdminClient, organizationId: string) {
  const { error: orgError } = await admin
    .schema("hrms")
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);
  if (orgError) {
    logBackupTechnical("validate-connection", orgError.message);
    throw new Error("Backup could not complete because the database connection failed validation.");
  }

  const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
  if (bucketError) {
    logBackupTechnical("validate-storage", bucketError.message);
    throw new Error("Backup could not complete because backup storage is unavailable.");
  }
  const hasBucket = (buckets ?? []).some((bucket) => bucket.id === "employee-documents");
  if (!hasBucket) {
    throw new Error("Backup could not complete because backup storage is not configured.");
  }
}

export async function listBackupJobs(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<BackupJobRow[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_backup_jobs")
    .select(
      "id, backup_type, format, status, storage_path, file_size_bytes, duration_ms, record_count, error_message, created_at, completed_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapJobRow(row as Record<string, unknown>));
}

export async function runBackupJob(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  backupType: BackupType,
  format: "json" | "csv",
): Promise<BackupJobRow> {
  const organizationId = profile.employee.organizationId;
  const started = Date.now();
  const admin = createAdminClient();

  const { data: inFlightJobs } = await supabase
    .schema("hrms")
    .from("system_backup_jobs")
    .select("id, created_at")
    .eq("organization_id", organizationId)
    .in("status", ["running", "pending"])
    .is("deleted_at", null)
    .limit(10);

  const staleCutoff = Date.now() - 30 * 60 * 1000;
  const activeJobs = (inFlightJobs ?? []).filter((row) => {
    const created = new Date(row.created_at as string).getTime();
    return Number.isFinite(created) && created >= staleCutoff;
  });
  const staleIds = (inFlightJobs ?? [])
    .filter((row) => !activeJobs.some((active) => active.id === row.id))
    .map((row) => row.id as string);

  if (staleIds.length > 0) {
    await supabase
      .schema("hrms")
      .from("system_backup_jobs")
      .update({
        status: "failed",
        error_message: "Backup timed out or was interrupted before completion.",
        completed_at: new Date().toISOString(),
      })
      .in("id", staleIds);
  }

  if (activeJobs.length > 0) {
    throw new Error("Backup could not complete because another backup is already running.");
  }

  await validateBackupPrerequisites(admin, organizationId);

  const { data: job, error: insertError } = await supabase
    .schema("hrms")
    .from("system_backup_jobs")
    .insert({
      organization_id: organizationId,
      backup_type: backupType,
      format,
      status: "running",
      created_by: profile.userId,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    logBackupTechnical("job-insert", insertError?.message ?? "missing job");
    throw new Error("Backup could not complete because the backup job could not be created.");
  }

  const jobId = job.id as string;

  try {
    const tables = tablesForBackupType(backupType);
    if (tables.length === 0) {
      throw new Error("Backup could not complete because no datasets are configured for this scope.");
    }

    const schemaCache: SchemaCache = new Map();
    const employeeIdsCache: { value: string[] | null } = { value: null };
    const roleIdsCache: { value: string[] | null } = { value: null };
    const payload: Record<string, Record<string, unknown>[]> = {};
    const skippedTables: Array<{ table: string; reason: string }> = [];
    const includedTables: string[] = [];
    let recordCount = 0;

    for (const table of tables) {
      try {
        const rows = await fetchTableData(
          admin,
          organizationId,
          table,
          schemaCache,
          employeeIdsCache,
          roleIdsCache,
        );
        payload[table] = rows;
        includedTables.push(table);
        recordCount += rows.length;
      } catch (tableError) {
        const technical =
          tableError instanceof Error ? tableError.message : "Unknown table export failure";
        logBackupTechnical(`table:${table}`, technical);

        if (isEssentialTable(backupType, table)) {
          throw tableError;
        }

        skippedTables.push({ table, reason: technical });
      }
    }

    if (includedTables.length === 0) {
      throw new Error("Backup could not complete because no datasets could be exported.");
    }

    const content =
      format === "json"
        ? JSON.stringify({
            exportedAt: new Date().toISOString(),
            organizationId,
            backupType,
            tables: includedTables,
            skippedTables: skippedTables.map((item) => item.table),
            warnings: skippedTables,
            data: payload,
          })
        : toCsv(
            Object.entries(payload).flatMap(([table, rows]) =>
              rows.map((row) => ({ _table: table, ...row })),
            ),
          );

    const buffer = Buffer.from(content, "utf-8");
    if (buffer.length === 0) {
      throw new Error("Backup could not complete because the generated export was empty.");
    }

    const storagePath = `${organizationId}/system-backups/${jobId}.${format}`;
    const contentType = contentTypeForFormat(format);

    const { error: uploadError } = await admin.storage
      .from("employee-documents")
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      logBackupTechnical("upload", uploadError.message);
      throw new Error(uploadError.message);
    }

    const { data: verified, error: verifyError } = await admin.storage
      .from("employee-documents")
      .download(storagePath);
    if (verifyError || !verified) {
      logBackupTechnical("verify", verifyError?.message ?? "missing object");
      throw new Error("Backup could not complete because file verification failed after upload.");
    }
    const verifiedSize = (await verified.arrayBuffer()).byteLength;
    if (verifiedSize <= 0) {
      throw new Error("Backup could not complete because the uploaded file was empty.");
    }

    const durationMs = Date.now() - started;
    const { data: updated, error: updateError } = await supabase
      .schema("hrms")
      .from("system_backup_jobs")
      .update({
        status: "completed",
        storage_path: storagePath,
        file_size_bytes: buffer.length,
        duration_ms: durationMs,
        record_count: recordCount,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId)
      .select(
        "id, backup_type, format, status, storage_path, file_size_bytes, duration_ms, record_count, error_message, created_at, completed_at",
      )
      .single();

    if (updateError || !updated) {
      logBackupTechnical("finalize", updateError?.message ?? "missing update");
      throw new Error("Backup could not complete because the job could not be finalized.");
    }

    if (skippedTables.length > 0) {
      logBackupTechnical(
        "completed-with-skips",
        skippedTables.map((item) => `${item.table}: ${item.reason}`).join("; "),
      );
    }

    return mapJobRow(updated as Record<string, unknown>);
  } catch (error) {
    const technical = error instanceof Error ? error.message : "Backup failed";
    logBackupTechnical(`job:${jobId}`, technical);

    await supabase
      .schema("hrms")
      .from("system_backup_jobs")
      .update({
        status: "failed",
        error_message: technical,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
      })
      .eq("id", jobId);

    const friendly = new Error(toFriendlyBackupError(technical)) as Error & {
      technicalMessage?: string;
    };
    friendly.technicalMessage = technical;
    throw friendly;
  }
}

export async function getBackupDownloadPayload(
  supabase: AuthSupabaseClient,
  organizationId: string,
  jobId: string,
): Promise<{ filename: string; mimeType: string; contentBase64: string } | null> {
  const { data: job, error } = await supabase
    .schema("hrms")
    .from("system_backup_jobs")
    .select("storage_path, format, backup_type, status")
    .eq("id", jobId)
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .maybeSingle();

  if (error || !job?.storage_path) return null;

  const admin = createAdminClient();
  const { data: file, error: downloadError } = await admin.storage
    .from("employee-documents")
    .download(job.storage_path as string);

  if (downloadError || !file) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const format = job.format as string;
  return {
    filename: `backup-${job.backup_type as string}-${jobId}.${format}`,
    mimeType: format === "json" ? "application/json" : "text/csv",
    contentBase64: buffer.toString("base64"),
  };
}

export async function getBackupOperationsSnapshot(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<BackupOperationsSnapshot> {
  const [jobs, scheduleResult, settingsResult] = await Promise.all([
    listBackupJobs(supabase, organizationId),
    supabase
      .schema("hrms")
      .from("system_scheduled_jobs")
      .select("job_key, job_name, schedule, last_run_at, last_status, next_run_at")
      .eq("organization_id", organizationId)
      .in("job_key", ["daily_backup", "weekly_backup", "hourly_backup", "monthly_backup"])
      .order("job_key"),
    supabase
      .schema("hrms")
      .from("organization_settings")
      .select("settings")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const settings = (settingsResult.data?.settings as Record<string, unknown> | null) ?? {};
  const backupSettings = (settings.backup as Record<string, unknown> | undefined) ?? settings;
  const scheduleFrequency = normalizeFrequency(
    backupSettings.backup_frequency ?? backupSettings.backupFrequency,
  );
  const retentionDays = Number(backupSettings.log_retention_days ?? backupSettings.logRetentionDays);
  const safeRetentionDays =
    Number.isFinite(retentionDays) && retentionDays >= 7 ? retentionDays : 90;

  const schedules = scheduleResult.data ?? [];
  const preferredKey =
    scheduleFrequency === "weekly"
      ? "weekly_backup"
      : scheduleFrequency === "hourly"
        ? "hourly_backup"
        : "daily_backup";
  const preferred =
    schedules.find((row) => row.job_key === preferredKey) ??
    schedules.find((row) => row.job_key === "daily_backup") ??
    schedules[0] ??
    null;

  const nextScheduledAt =
    (preferred?.next_run_at as string | null) ??
    computeNextRunAt(scheduleFrequency).toISOString();

  const completed = jobs.filter((job) => job.status === "completed");
  const failed = jobs.filter((job) => job.status === "failed");
  const running = jobs.some((job) => job.status === "running" || job.status === "pending");
  const lastSuccessfulAt = completed[0]?.completedAt ?? completed[0]?.createdAt ?? null;
  const totalBackupBytes = completed.reduce((sum, job) => sum + (job.fileSizeBytes ?? 0), 0);
  const latest = jobs[0] ?? null;

  // Prefer latest outcome, but any completed backup keeps the system Protected.
  let status: BackupOperationsSnapshot["status"] = "idle";
  if (running || latest?.status === "running" || latest?.status === "pending") {
    status = "attention";
  } else if (lastSuccessfulAt) {
    status = "healthy";
  } else if (latest?.status === "failed" || failed.length > 0) {
    status = "failed";
  }

  return {
    jobs,
    lastSuccessfulAt,
    nextScheduledAt,
    scheduleFrequency,
    scheduleLabel: FREQUENCY_LABEL[scheduleFrequency],
    retentionDays: safeRetentionDays,
    status,
    totalBackupBytes,
    completedCount: completed.length,
    failedCount: failed.length,
    storageUsageLabel: formatBytes(totalBackupBytes),
  };
}

export async function updateBackupSchedulePreferences(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { frequency: BackupScheduleFrequency; retentionDays: number },
): Promise<BackupOperationsSnapshot> {
  const organizationId = profile.employee.organizationId;
  const frequency = normalizeFrequency(input.frequency);
  const retentionDays = Math.min(3650, Math.max(7, Math.round(input.retentionDays)));
  const nextRunAt = computeNextRunAt(frequency).toISOString();

  const { data: settingsRow } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("id, settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  const currentSettings = (settingsRow?.settings as Record<string, unknown> | null) ?? {};
  const currentBackup = (currentSettings.backup as Record<string, unknown> | undefined) ?? {};
  const nextSettings = {
    ...currentSettings,
    backup: {
      ...currentBackup,
      backup_frequency: frequency,
      log_retention_days: retentionDays,
    },
  };

  if (settingsRow?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("organization_settings")
      .update({
        settings: nextSettings,
        updated_at: new Date().toISOString(),
        updated_by: profile.userId,
      })
      .eq("id", settingsRow.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("organization_settings").insert({
      organization_id: organizationId,
      settings: nextSettings,
      created_by: profile.userId,
      updated_by: profile.userId,
    });
    if (error) throw new Error(error.message);
  }

  const jobKey =
    frequency === "weekly" ? "weekly_backup" : frequency === "hourly" ? "hourly_backup" : "daily_backup";
  const jobName =
    frequency === "weekly" ? "Weekly Backup" : frequency === "hourly" ? "Hourly Backup" : "Daily Backup";

  const { data: existing } = await supabase
    .schema("hrms")
    .from("system_scheduled_jobs")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("job_key", jobKey)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("system_scheduled_jobs")
      .update({
        schedule: FREQUENCY_CRON[frequency],
        next_run_at: nextRunAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("system_scheduled_jobs").insert({
      organization_id: organizationId,
      job_key: jobKey,
      job_name: jobName,
      schedule: FREQUENCY_CRON[frequency],
      next_run_at: nextRunAt,
      last_status: "idle",
    });
    if (error) throw new Error(error.message);
  }

  return getBackupOperationsSnapshot(supabase, organizationId);
}
