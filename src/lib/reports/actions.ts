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
  reportToExcelXml,
  reportToPdfBytes,
} from "@/lib/reports/services/reports-utils";
import { requireServerAnyPermission, requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  reportFiltersSchema,
  reportScheduleSchema,
  reportsSettingsSchema,
} from "@/lib/validations/reports";
import type { ReportExportFormat, ReportKey } from "@/types/reports";

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

    if (format === "csv") {
      return {
        success: true as const,
        filename: `${reportKey}.csv`,
        mimeType: "text/csv;charset=utf-8",
        contentBase64: Buffer.from(reportToCsv(result), "utf8").toString("base64"),
        rowCount: result.total,
      };
    }

    if (format === "excel") {
      return {
        success: true as const,
        filename: `${reportKey}.xls`,
        mimeType: "application/vnd.ms-excel",
        contentBase64: Buffer.from(reportToExcelXml(result), "utf8").toString("base64"),
        rowCount: result.total,
      };
    }

    const pdf = await reportToPdfBytes(result);
    return {
      success: true as const,
      filename: `${reportKey}.pdf`,
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
