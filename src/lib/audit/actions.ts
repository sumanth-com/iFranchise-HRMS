"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ROUTES } from "@/lib/audit/constants";
import { exportAuditLogs, auditRowsForPdfExport } from "@/lib/audit/services/audit-export";
import {
  archiveExpiredAuditLogs,
  saveAuditSettings,
  softDeleteAuditLog,
  softDeleteAuditLogs,
} from "@/lib/audit/services/audit-mutations";
import {
  getAuditLogDetail,
  listAuditLogs,
} from "@/lib/audit/services/audit-queries";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import {
  AUDIT_EXPORT_PERMISSIONS,
  AUDIT_VIEW_PERMISSIONS,
  isSuperAdmin,
} from "@/lib/audit/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { createClient } from "@/lib/supabase/server";
import { reportToPdfBytes } from "@/lib/reports/services/reports-utils";
import {
  auditExportParamsSchema,
  auditSettingsFormSchema,
} from "@/lib/validations/audit";
import type { AuditActionResult, AuditExportFormat } from "@/types/audit";

function revalidateAudit() {
  for (const route of Object.values(AUDIT_ROUTES)) {
    if (typeof route === "string") revalidatePath(route);
  }
  revalidatePath(SYSTEM_ADMIN_ROUTES.audit);
  revalidatePath(`${SYSTEM_ADMIN_ROUTES.audit}/logs`);
}

export async function saveAuditSettingsAction(
  input: unknown,
): Promise<AuditActionResult> {
  try {
    const profile = await requireServerAnyPermission([...AUDIT_EXPORT_PERMISSIONS]);
    const supabase = await createClient();
    const parsed = auditSettingsFormSchema.parse(input);
    await saveAuditSettings(supabase, profile, parsed);
    revalidateAudit();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}

export async function exportAuditLogsAction(
  filters: unknown,
  format: AuditExportFormat,
) {
  try {
    if (format !== "excel" && format !== "pdf") {
      return { success: false as const, message: "Unsupported export format" };
    }

    const profile = await requireServerAnyPermission([...AUDIT_EXPORT_PERMISSIONS]);
    const supabase = await createClient();
    const filterObj =
      filters && typeof filters === "object" ? (filters as Record<string, unknown>) : {};
    const { page: _page, pageSize: _pageSize, ...filterFields } = filterObj;
    const parsed = auditExportParamsSchema.parse({
      ...filterFields,
      page: 1,
      pageSize: 5000,
    });
    const result = await listAuditLogs(supabase, profile, parsed, { forExport: true });

    const ctx = await getRequestAuditContext();
    await writeApplicationAudit(supabase, {
      organizationId: profile.employee.organizationId,
      module: "reports",
      action: "export",
      description: `Exported ${result.items.length} audit log records as ${format.toUpperCase()}`,
      recordId: `export-${format}`,
      priority: "medium",
      ...ctx,
      metadata: { format, total: result.items.length },
    });

    if (format === "pdf") {
      const report = auditRowsForPdfExport(result.items);
      const pdf = await reportToPdfBytes(report);
      return {
        success: true as const,
        filename: "audit-logs.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from(pdf).toString("base64"),
        rowCount: result.items.length,
      };
    }

    const content = exportAuditLogs(result.items, "excel");
    return {
      success: true as const,
      filename: "audit-logs.xls",
      mimeType: "application/vnd.ms-excel",
      contentBase64: Buffer.from(content, "utf8").toString("base64"),
      rowCount: result.items.length,
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export audit logs",
    };
  }
}

export async function runAuditRetentionAction(): Promise<AuditActionResult<number>> {
  try {
    const profile = await requireServerAnyPermission([...AUDIT_EXPORT_PERMISSIONS]);
    const supabase = await createClient();
    const { data } = await supabase
      .schema("hrms")
      .from("audit_settings")
      .select("retention_days")
      .eq("organization_id", profile.employee.organizationId)
      .maybeSingle();

    const archived = await archiveExpiredAuditLogs(
      supabase,
      profile,
      data?.retention_days ?? 365,
    );
    revalidateAudit();
    return { success: true, data: archived };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to archive logs",
    };
  }
}

export async function logAuditViewAction(recordId: string) {
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const ctx = await getRequestAuditContext();
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "dashboard",
    action: "update",
    description: "Viewed audit log detail",
    recordId,
    priority: "low",
    ...ctx,
  });
}

export async function getAuditLogDetailAction(ref: string) {
  try {
    const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
    const supabase = await createClient();
    const detail = await getAuditLogDetail(supabase, profile, ref);
    if (!detail) {
      return { success: false as const, message: "Audit log not found" };
    }
    return { success: true as const, data: detail };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load audit detail",
    };
  }
}

export async function deleteAuditLogAction(
  auditLogId: string,
): Promise<AuditActionResult> {
  try {
    const profile = await requireServerAnyPermission([...AUDIT_EXPORT_PERMISSIONS]);
    if (!isSuperAdmin(profile)) {
      return { success: false, message: "Only Super Admin can delete audit logs" };
    }

    await softDeleteAuditLog(profile, auditLogId);

    const supabase = await createClient();
    const ctx = await getRequestAuditContext();
    await writeApplicationAudit(supabase, {
      organizationId: profile.employee.organizationId,
      module: "settings",
      action: "delete",
      description: "Soft-deleted an audit log entry",
      recordId: auditLogId,
      priority: "high",
      ...ctx,
    });

    revalidateAudit();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete audit log",
    };
  }
}

export async function bulkDeleteAuditLogsAction(
  auditLogIds: string[],
): Promise<AuditActionResult<{ deleted: number }>> {
  try {
    const profile = await requireServerAnyPermission([...AUDIT_EXPORT_PERMISSIONS]);
    if (!isSuperAdmin(profile)) {
      return { success: false, message: "Only Super Admin can delete audit logs" };
    }

    const deleted = await softDeleteAuditLogs(profile, auditLogIds);
    if (deleted === 0) {
      return { success: false, message: "No matching audit entries to delete" };
    }

    const supabase = await createClient();
    const ctx = await getRequestAuditContext();
    await writeApplicationAudit(supabase, {
      organizationId: profile.employee.organizationId,
      module: "settings",
      action: "delete",
      description: `Soft-deleted ${deleted} audit log entries`,
      recordId: `bulk-delete-${deleted}`,
      priority: "high",
      ...ctx,
      metadata: { deleted, requested: auditLogIds.length },
    });

    revalidateAudit();
    return { success: true, data: { deleted } };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete audit logs",
    };
  }
}
