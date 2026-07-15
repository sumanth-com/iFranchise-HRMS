"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  buildCeoAnalyticsExportResult,
  buildCeoAnalyticsSummaryPdf,
  getCeoAnalyticsPageData,
} from "@/lib/ceo/services/ceo-analytics-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import {
  reportToCsv,
  reportToExcelXml,
  reportToPdfBytes,
} from "@/lib/reports/services/reports-utils";
import { createClient } from "@/lib/supabase/server";
import {
  ceoAnalyticsExportSchema,
  ceoAnalyticsListParamsSchema,
} from "@/lib/validations/ceo-analytics";
import type {
  CeoAnalyticsListParams,
  CeoAnalyticsPageData,
} from "@/types/ceo-analytics";

export async function getCeoAnalyticsModuleData(
  params: CeoAnalyticsListParams,
): Promise<CeoAnalyticsPageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoAnalyticsPageData(
    supabase,
    profile,
    ceoAnalyticsListParamsSchema.parse(params),
  );
}

export async function fetchCeoAnalyticsPageAction(
  params: CeoAnalyticsListParams,
): Promise<CeoAnalyticsPageData> {
  return getCeoAnalyticsModuleData(params);
}

export async function exportCeoAnalyticsAction(input: CeoAnalyticsListParams & {
  format: "csv" | "excel" | "pdf" | "summary_pdf";
}) {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoAnalyticsExportSchema.parse(input);
    const data = await getCeoAnalyticsPageData(supabase, profile, parsed);
    const result = buildCeoAnalyticsExportResult(data);

    if (parsed.format === "csv") {
      return {
        success: true as const,
        filename: "executive-analytics.csv",
        mimeType: "text/csv;charset=utf-8",
        contentBase64: Buffer.from(reportToCsv(result), "utf8").toString("base64"),
      };
    }

    if (parsed.format === "excel") {
      return {
        success: true as const,
        filename: "executive-analytics.xls",
        mimeType: "application/vnd.ms-excel",
        contentBase64: Buffer.from(reportToExcelXml(result), "utf8").toString("base64"),
      };
    }

    if (parsed.format === "summary_pdf") {
      const pdf = await buildCeoAnalyticsSummaryPdf(data);
      return {
        success: true as const,
        filename: "executive-analytics-summary.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from(pdf).toString("base64"),
      };
    }

    const pdf = await reportToPdfBytes(result);
    return {
      success: true as const,
      filename: "executive-analytics.pdf",
      mimeType: "application/pdf",
      contentBase64: Buffer.from(pdf).toString("base64"),
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export analytics",
    };
  }
}
