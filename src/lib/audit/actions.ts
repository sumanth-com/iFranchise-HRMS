"use server";

import { revalidatePath } from "next/cache";

import { AUDIT_ROUTES } from "@/lib/audit/constants";
import { exportAuditLogs, auditRowsForExport } from "@/lib/audit/services/audit-export";
import { archiveExpiredAuditLogs, saveAuditSettings } from "@/lib/audit/services/audit-mutations";
import { listAuditLogs } from "@/lib/audit/services/audit-queries";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import {
  AUDIT_EXPORT_PERMISSIONS,
  AUDIT_VIEW_PERMISSIONS,
} from "@/lib/audit/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { reportToPdfBytes } from "@/lib/reports/services/reports-utils";
import {
  auditListParamsSchema,
  auditSettingsFormSchema,
} from "@/lib/validations/audit";
import type { AuditActionResult, AuditExportFormat } from "@/types/audit";

function revalidateAudit() {
  for (const route of Object.values(AUDIT_ROUTES)) {
    if (typeof route === "string") revalidatePath(route);
  }
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
    const profile = await requireServerAnyPermission([...AUDIT_EXPORT_PERMISSIONS]);
    const supabase = await createClient();
    const parsed = auditListParamsSchema.parse({ ...(filters as object), pageSize: 5000, page: 1 });
    const result = await listAuditLogs(supabase, profile, parsed);

    const ctx = await getRequestAuditContext();
    await writeApplicationAudit(supabase, {
      organizationId: profile.employee.organizationId,
      module: "reports",
      action: "export",
      description: `Exported ${result.total} audit log records as ${format.toUpperCase()}`,
      recordId: `export-${format}`,
      priority: "medium",
      ...ctx,
      metadata: { format, total: result.total },
    });

    if (format === "pdf") {
      const report = auditRowsForExport(result.items);
      const pdf = await reportToPdfBytes(report);
      return {
        success: true as const,
        filename: "audit-logs.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from(pdf).toString("base64"),
        rowCount: result.total,
      };
    }

    const content = exportAuditLogs(result.items, format);
    return {
      success: true as const,
      filename: format === "excel" ? "audit-logs.xls" : "audit-logs.csv",
      mimeType:
        format === "excel" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8",
      contentBase64: Buffer.from(content, "utf8").toString("base64"),
      rowCount: result.total,
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
