"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  buildCeoAnalyticsExportResult,
  getCeoAnalyticsPageData,
} from "@/lib/ceo/services/ceo-analytics-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import {
  reportToExcelXml,
  reportToPdfBytes,
} from "@/lib/reports/services/reports-utils";
import { createClient } from "@/lib/supabase/server";
import {
  ceoAnalyticsExportSchema,
  ceoAnalyticsListParamsSchema,
} from "@/lib/validations/ceo-analytics";
import type {
  CeoAnalyticsExportFormat,
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

function toBase64Bytes(bytes: Uint8Array) {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
    "base64",
  );
}

export async function exportCeoAnalyticsAction(
  input: CeoAnalyticsListParams & { format: CeoAnalyticsExportFormat },
) {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoAnalyticsExportSchema.parse(input);
    const data = await getCeoAnalyticsPageData(supabase, profile, parsed);
    const result = buildCeoAnalyticsExportResult(data);

    if (parsed.format === "excel") {
      const xml = reportToExcelXml(result);
      return {
        success: true as const,
        filename: "executive-analytics.xls",
        mimeType: "application/vnd.ms-excel",
        contentBase64: Buffer.from(xml, "utf8").toString("base64"),
      };
    }

    const pdf = await reportToPdfBytes(result);
    return {
      success: true as const,
      filename: "executive-analytics.pdf",
      mimeType: "application/pdf",
      contentBase64: toBase64Bytes(pdf),
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to export analytics",
    };
  }
}
