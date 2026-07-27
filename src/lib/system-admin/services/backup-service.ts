import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";

export const BACKUP_TYPES = [
  "full",
  "employees",
  "payroll",
  "attendance",
  "leave",
  "performance",
  "recruitment",
  "documents",
  "assets",
  "organization",
  "settings",
  "permissions",
  "audit_logs",
] as const;

export type BackupType = (typeof BACKUP_TYPES)[number];

export type BackupJobRow = {
  id: string;
  backupType: string;
  format: string;
  status: string;
  storagePath: string | null;
  fileSizeBytes: number | null;
  durationMs: number | null;
  recordCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

const TYPE_TABLE_MAP: Record<string, string[]> = {
  employees: ["employees"],
  payroll: ["payrolls", "payslips", "salary_structures"],
  attendance: ["attendance"],
  leave: ["leave_requests", "leave_balances"],
  performance: ["performance_reviews"],
  recruitment: ["recruitment_candidates"],
  documents: ["employee_documents"],
  assets: ["assets"],
  organization: ["departments", "designations", "branches", "holidays"],
  settings: ["system_settings", "organization_settings"],
  permissions: ["roles", "permissions", "role_permissions", "user_roles"],
  audit_logs: ["audit_logs"],
};

async function fetchTableData(
  supabase: AuthSupabaseClient,
  organizationId: string,
  table: string,
): Promise<Record<string, unknown>[]> {
  const query = supabase.schema("hrms").from(table).select("*").is("deleted_at", null);

  if (table === "organizations") {
    const { data, error } = await query.eq("id", organizationId);
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as Record<string, unknown>[];
  }

  if (
    [
      "employees",
      "payrolls",
      "roles",
      "user_roles",
      "audit_logs",
      "system_settings",
      "departments",
      "designations",
      "branches",
      "holidays",
      "assets",
      "employee_documents",
      "leave_requests",
      "attendance",
      "recruitment_candidates",
      "performance_reviews",
      "organization_settings",
    ].includes(table)
  ) {
    const { data, error } = await query.eq("organization_id", organizationId);
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as Record<string, unknown>[];
  }

  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
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
          const text = value === null || value === undefined ? "" : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
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
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    backupType: row.backup_type as string,
    format: row.format as string,
    status: row.status as string,
    storagePath: (row.storage_path as string | null) ?? null,
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : null,
    durationMs: row.duration_ms ? Number(row.duration_ms) : null,
    recordCount: row.record_count ? Number(row.record_count) : null,
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  }));
}

export async function runBackupJob(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  backupType: BackupType,
  format: "json" | "csv",
): Promise<BackupJobRow> {
  const organizationId = profile.employee.organizationId;
  const started = Date.now();

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

  if (insertError || !job) throw new Error(insertError?.message ?? "Failed to start backup");

  const jobId = job.id as string;

  try {
    const tables =
      backupType === "full"
        ? Object.values(TYPE_TABLE_MAP).flat()
        : TYPE_TABLE_MAP[backupType] ?? [];

    const payload: Record<string, Record<string, unknown>[]> = {};
    let recordCount = 0;

    for (const table of tables) {
      const rows = await fetchTableData(supabase, organizationId, table);
      payload[table] = rows;
      recordCount += rows.length;
    }

    const content =
      format === "json"
        ? JSON.stringify({ exportedAt: new Date().toISOString(), organizationId, data: payload })
        : toCsv(
            Object.entries(payload).flatMap(([table, rows]) =>
              rows.map((row) => ({ _table: table, ...row })),
            ),
          );

    const buffer = Buffer.from(content, "utf-8");
    const storagePath = `${organizationId}/system-backups/${jobId}.${format}`;
    const admin = createAdminClient();

    const { error: uploadError } = await admin.storage
      .from("employee-documents")
      .upload(storagePath, buffer, {
        contentType: format === "json" ? "application/json" : "text/csv",
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

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
      })
      .eq("id", jobId)
      .select(
        "id, backup_type, format, status, storage_path, file_size_bytes, duration_ms, record_count, error_message, created_at, completed_at",
      )
      .single();

    if (updateError || !updated) throw new Error(updateError?.message ?? "Failed to finalize backup");

    return {
      id: updated.id as string,
      backupType: updated.backup_type as string,
      format: updated.format as string,
      status: updated.status as string,
      storagePath: updated.storage_path as string,
      fileSizeBytes: Number(updated.file_size_bytes),
      durationMs: Number(updated.duration_ms),
      recordCount: Number(updated.record_count),
      errorMessage: null,
      createdAt: updated.created_at as string,
      completedAt: updated.completed_at as string,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    await supabase
      .schema("hrms")
      .from("system_backup_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
      })
      .eq("id", jobId);
    throw new Error(message);
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
