"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { isManagerAllowedReportKey } from "@/lib/manager/reports/manager-report-definitions";
import {
  buildManagerScopedFilters,
  getManagerScopedReportContext,
  getManagerTeamReportsPageData as loadManagerTeamReportsPageData,
} from "@/lib/manager/services/team-reports-queries";
import { getManagerTeamScope } from "@/lib/manager/services/team-queries";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { runReport } from "@/lib/reports/services/reports-queries";
import {
  reportToCsv,
  reportToExcelXml,
  reportToPdfBytes,
} from "@/lib/reports/services/reports-utils";
import { createClient } from "@/lib/supabase/server";
import {
  managerReportExportSchema,
  managerReportsListParamsSchema,
} from "@/lib/validations/manager-reports";
import { reportFiltersSchema } from "@/lib/validations/reports";
import type { ManagerReportsPageData } from "@/types/manager-reports";
import type { ReportExportFormat, ReportKey, ReportResult } from "@/types/reports";

async function getAuthenticatedContext() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "reports.view",
  ]);
  const supabase = await createClient();
  const { teamIds } = await getManagerTeamScope(supabase, profile);
  const scope = await getManagerScopedReportContext(supabase, profile, teamIds);
  return { profile, supabase, teamIds, scope };
}

function revalidateReportsPaths() {
  revalidatePath(MANAGER_ROUTES.reports);
  revalidatePath(MANAGER_ROUTES.home);
}

export async function runManagerReportAction(
  reportKey: ReportKey,
  filters: unknown,
): Promise<{ success: true; data: ReportResult } | { success: false; message: string }> {
  try {
    if (!isManagerAllowedReportKey(reportKey)) {
      return { success: false, message: "This report is not available in the manager portal." };
    }

    const { profile, supabase, scope } = await getAuthenticatedContext();
    const parsed = reportFiltersSchema.parse(filters ?? {});
    const scopedFilters = buildManagerScopedFilters(parsed, scope);

    if (parsed.employeeId && !scope.teamEmployeeIds.includes(parsed.employeeId)) {
      return { success: false, message: "You can only run reports for your team members." };
    }

    const result = await runReport(supabase, profile, reportKey, scopedFilters);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to run report.",
    };
  }
}

export async function exportManagerReportAction(
  reportKey: ReportKey,
  filters: unknown,
  format: ReportExportFormat,
) {
  try {
    const parsedExport = managerReportExportSchema.parse({
      reportKey,
      format,
      filters,
    });

    if (!isManagerAllowedReportKey(reportKey)) {
      return { success: false as const, message: "This report is not available in the manager portal." };
    }

    await requireServerAnyPermission([PORTAL_PERMISSIONS.manager, "reports.export"]);

    const { profile, supabase, scope } = await getAuthenticatedContext();
    const parsedFilters = reportFiltersSchema.parse(parsedExport.filters ?? {});
    const scopedFilters = buildManagerScopedFilters(parsedFilters, scope);

    if (
      parsedFilters.employeeId &&
      !scope.teamEmployeeIds.includes(parsedFilters.employeeId)
    ) {
      return { success: false as const, message: "You can only export data for your team members." };
    }

    const result = await runReport(supabase, profile, reportKey, scopedFilters);

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

    const pdfBytes = await reportToPdfBytes(result);
    return {
      success: true as const,
      filename: `${reportKey}.pdf`,
      mimeType: "application/pdf",
      contentBase64: Buffer.from(pdfBytes).toString("base64"),
      rowCount: result.total,
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export report.",
    };
  }
}

export async function getManagerTeamReportsPageData(
  params: unknown,
): Promise<ManagerReportsPageData> {
  await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const parsed = managerReportsListParamsSchema.parse(params);
  const supabase = await createClient();
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "reports.view",
  ]);
  const { teamIds } = await getManagerTeamScope(supabase, profile);
  return loadManagerTeamReportsPageData(supabase, profile, teamIds, parsed);
}

export async function refreshManagerReportsAction(params: unknown) {
  const data = await getManagerTeamReportsPageData(params);
  revalidateReportsPaths();
  return data;
}
