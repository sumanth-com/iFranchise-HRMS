"use server";

import { revalidatePath } from "next/cache";

import { REPORTS_ROUTES } from "@/lib/reports/constants";
import { runReport } from "@/lib/reports/services/reports-queries";
import {
  createReportSchedule,
  deleteReportSchedule,
  runDueReportSchedules,
  runScheduleNow,
  updateReportSchedule,
} from "@/lib/reports/services/reports-schedules";
import {
  getReportsSettings,
  updateReportsSettings,
} from "@/lib/reports/services/reports-settings";
import {
  reportToCsv,
  reportToPdfBytes,
  toCell,
} from "@/lib/reports/services/reports-utils";
import { buildXlsxBuffer } from "@/lib/reports/services/xlsx-builder";
import { requireServerAnyPermission, requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  generatedReportSchema,
  reportFiltersSchema,
  reportScheduleSchema,
  reportsSettingsSchema,
} from "@/lib/validations/reports";
import type { ReportExportFormat, ReportKey, ReportResult } from "@/types/reports";

function revalidateReports() {
  Object.values(REPORTS_ROUTES).forEach((path) => revalidatePath(path));
}

export async function runReportAction(reportKey: ReportKey, filters: unknown) {
  try {
    const profile = await requireServerPermission("reports.view");
    const supabase = await createClient();
    const parsed = reportFiltersSchema.parse(filters ?? {});
    const result = await runReport(supabase, profile, reportKey, parsed);
    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to run report",
    };
  }
}

function exportFilename(
  reportKey: string,
  format: ReportExportFormat,
  dateFrom?: string,
  dateTo?: string,
) {
  const base = reportKey.replace(/_/g, "-");
  const range = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : "";
  const ext = format === "excel" ? "xlsx" : format;
  return `${base}${range}.${ext}`;
}

function serializeGeneratedReport(
  result: ReportResult,
  format: ReportExportFormat,
  dateFrom?: string,
  dateTo?: string,
) {
  const filename = exportFilename(result.key, format, dateFrom, dateTo);

  if (format === "csv") {
    return {
      success: true as const,
      filename,
      mimeType: "text/csv;charset=utf-8",
      contentBase64: Buffer.from(reportToCsv(result), "utf8").toString("base64"),
      rowCount: result.total,
    };
  }

  if (format === "excel") {
    const headers = result.columns.map((column) => column.header);
    const rows = result.rows.map((row) =>
      result.columns.map((column) => {
        const value = row[column.key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "boolean") return value;
        return toCell(value);
      }),
    );

    return {
      success: true as const,
      filename,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contentBase64: buildXlsxBuffer(result.title, headers, rows).toString("base64"),
      rowCount: result.total,
    };
  }

  return null;
}

export async function exportReportAction(
  reportKey: ReportKey,
  filters: unknown,
  format: ReportExportFormat,
) {
  try {
    const profile = await requireServerPermission("reports.export");
    const supabase = await createClient();
    const parsed = reportFiltersSchema.parse(filters ?? {});
    const result = await runReport(supabase, profile, reportKey, parsed);
    const serialized = serializeGeneratedReport(
      result,
      format,
      parsed.dateFrom || undefined,
      parsed.dateTo || undefined,
    );
    if (serialized) return serialized;

    const pdf = await reportToPdfBytes(result);
    return {
      success: true as const,
      filename: exportFilename(reportKey, "pdf", parsed.dateFrom || undefined, parsed.dateTo || undefined),
      mimeType: "application/pdf",
      contentBase64: Buffer.from(pdf).toString("base64"),
      rowCount: result.total,
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export report",
    };
  }
}

export async function exportGeneratedReportAction(
  generated: unknown,
  format: ReportExportFormat,
  dateFrom?: string,
  dateTo?: string,
) {
  try {
    await requireServerPermission("reports.export");
    const result = generatedReportSchema.parse(generated) as ReportResult;
    const serialized = serializeGeneratedReport(result, format, dateFrom, dateTo);
    if (serialized) return serialized;

    const pdf = await reportToPdfBytes(result);
    return {
      success: true as const,
      filename: exportFilename(result.key, "pdf", dateFrom, dateTo),
      mimeType: "application/pdf",
      contentBase64: Buffer.from(pdf).toString("base64"),
      rowCount: result.total,
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export report",
    };
  }
}

export async function saveReportScheduleAction(input: unknown, scheduleId?: string) {
  try {
    const profile = await requireServerPermission("reports.schedule");
    const supabase = await createClient();
    const parsed = reportScheduleSchema.parse(input);
    if (scheduleId) {
      await updateReportSchedule(supabase, profile, scheduleId, parsed);
    } else {
      await createReportSchedule(supabase, profile, parsed);
    }
    revalidateReports();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save schedule",
    };
  }
}

export async function deleteReportScheduleAction(scheduleId: string) {
  try {
    const profile = await requireServerPermission("reports.schedule");
    const supabase = await createClient();
    await deleteReportSchedule(supabase, profile, scheduleId);
    revalidateReports();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to delete schedule",
    };
  }
}

export async function runScheduleNowAction(scheduleId: string) {
  try {
    const profile = await requireServerPermission("reports.schedule");
    const supabase = await createClient();
    await runScheduleNow(supabase, profile, scheduleId);
    revalidateReports();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to run schedule",
    };
  }
}

export async function processDueSchedulesAction() {
  try {
    const profile = await requireServerPermission("reports.schedule");
    const supabase = await createClient();
    const result = await runDueReportSchedules(supabase, profile);
    revalidateReports();
    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to process schedules",
    };
  }
}

export async function saveReportsSettingsAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission(["reports.settings", "settings.manage"]);
    const supabase = await createClient();
    const parsed = reportsSettingsSchema.parse(input);
    const data = await updateReportsSettings(
      supabase,
      profile.employee.organizationId,
      profile.userId,
      parsed,
    );
    revalidateReports();
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}

export async function getReportsSettingsAction() {
  const profile = await requireServerAnyPermission(["reports.view", "reports.settings"]);
  const supabase = await createClient();
  return getReportsSettings(supabase, profile.employee.organizationId);
}
