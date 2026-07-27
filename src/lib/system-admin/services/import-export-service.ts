import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";

export type ImportJobRow = {
  id: string;
  module: string;
  format: string;
  status: string;
  recordCount: number | null;
  successCount: number | null;
  errorCount: number | null;
  createdAt: string;
  completedAt: string | null;
};

export const EXPORT_MODULES = [
  "employees",
  "departments",
  "roles",
  "attendance",
  "leave",
  "assets",
  "payroll",
  "performance",
] as const;

export type ExportModule = (typeof EXPORT_MODULES)[number];

const MODULE_TABLE: Record<ExportModule, string> = {
  employees: "employees",
  departments: "departments",
  roles: "roles",
  attendance: "attendance",
  leave: "leave_requests",
  assets: "assets",
  payroll: "payrolls",
  performance: "performance_reviews",
};

export async function listImportJobs(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<ImportJobRow[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_import_jobs")
    .select(
      "id, module, format, status, record_count, success_count, error_count, created_at, completed_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    module: row.module as string,
    format: row.format as string,
    status: row.status as string,
    recordCount: row.record_count ? Number(row.record_count) : null,
    successCount: row.success_count ? Number(row.success_count) : null,
    errorCount: row.error_count ? Number(row.error_count) : null,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  }));
}

export async function exportModuleData(
  supabase: AuthSupabaseClient,
  organizationId: string,
  module: ExportModule,
  format: "json" | "csv",
): Promise<{ filename: string; mimeType: string; contentBase64: string }> {
  const table = MODULE_TABLE[module];
  const { data, error } = await supabase
    .schema("hrms")
    .from(table)
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  let content: string;
  if (format === "json") {
    content = JSON.stringify({ module, exportedAt: new Date().toISOString(), rows });
  } else {
    if (rows.length === 0) content = "";
    else {
      const headers = Object.keys(rows[0]);
      content = [
        headers.join(","),
        ...rows.map((row) =>
          headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");
    }
  }

  const buffer = Buffer.from(content, "utf-8");
  return {
    filename: `export-${module}-${Date.now()}.${format}`,
    mimeType: format === "json" ? "application/json" : "text/csv",
    contentBase64: buffer.toString("base64"),
  };
}

export async function importEmployeesCsv(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  csvContent: string,
): Promise<ImportJobRow> {
  const organizationId = profile.employee.organizationId;
  const lines = csvContent.trim().split("\n");
  const headers = lines[0]?.split(",").map((h) => h.replace(/"/g, "").trim()) ?? [];
  const errors: string[] = [];
  let success = 0;

  const { data: job, error: jobError } = await supabase
    .schema("hrms")
    .from("system_import_jobs")
    .insert({
      organization_id: organizationId,
      module: "employees",
      format: "csv",
      status: "running",
      created_by: profile.userId,
    })
    .select("id")
    .single();

  if (jobError || !job) throw new Error(jobError?.message ?? "Failed to start import");

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(",").map((v) => v.replace(/"/g, "").trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    const email = row.email?.toLowerCase();
    if (!email || !row.first_name || !row.last_name) {
      errors.push(`Row ${i}: missing required fields`);
      continue;
    }

    const { data: existing } = await supabase
      .schema("hrms")
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      errors.push(`Row ${i}: duplicate email ${email}`);
      continue;
    }

    const { error: insertError } = await supabase.schema("hrms").from("employees").insert({
      organization_id: organizationId,
      first_name: row.first_name,
      last_name: row.last_name,
      email,
      employee_code: row.employee_code || `IMP-${Date.now()}-${i}`,
      employment_status: "active",
      account_status: "active",
      status: "active",
    });

    if (insertError) errors.push(`Row ${i}: ${insertError.message}`);
    else success += 1;
  }

  const { data: updated, error: updateError } = await supabase
    .schema("hrms")
    .from("system_import_jobs")
    .update({
      status: errors.length > 0 && success === 0 ? "failed" : "completed",
      record_count: lines.length - 1,
      success_count: success,
      error_count: errors.length,
      errors: errors.slice(0, 50),
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .select(
      "id, module, format, status, record_count, success_count, error_count, created_at, completed_at",
    )
    .single();

  if (updateError || !updated) throw new Error(updateError?.message ?? "Import finalize failed");

  return {
    id: updated.id as string,
    module: updated.module as string,
    format: updated.format as string,
    status: updated.status as string,
    recordCount: Number(updated.record_count),
    successCount: Number(updated.success_count),
    errorCount: Number(updated.error_count),
    createdAt: updated.created_at as string,
    completedAt: updated.completed_at as string,
  };
}

export async function restoreFromBackupJson(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  jobId: string,
): Promise<{ restoredTables: number; recordCount: number }> {
  const { data: job } = await supabase
    .schema("hrms")
    .from("system_backup_jobs")
    .select("storage_path, status")
    .eq("id", jobId)
    .eq("organization_id", profile.employee.organizationId)
    .eq("status", "completed")
    .maybeSingle();

  if (!job?.storage_path) throw new Error("Backup not found or not completed");

  const admin = createAdminClient();
  const { data: file, error } = await admin.storage
    .from("employee-documents")
    .download(job.storage_path as string);

  if (error || !file) throw new Error(error?.message ?? "Failed to download backup");

  const parsed = JSON.parse(await file.text()) as {
    data?: Record<string, Record<string, unknown>[]>;
  };

  let restoredTables = 0;
  let recordCount = 0;

  const allowedRestoreTables = ["departments", "designations", "branches", "holidays"];
  for (const table of allowedRestoreTables) {
    const rows = parsed.data?.[table];
    if (!rows?.length) continue;
    for (const row of rows) {
      const { id, ...rest } = row;
      void id;
      const { error: upsertError } = await supabase
        .schema("hrms")
        .from(table)
        .upsert({ ...rest, organization_id: profile.employee.organizationId });
      if (!upsertError) recordCount += 1;
    }
    restoredTables += 1;
  }

  return { restoredTables, recordCount };
}
