"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  downloadCeoReportRun,
  generateCeoReport,
  getCeoReportPreview,
  getCeoReportsPageData,
  listCeoReportLibrary,
  removeCeoReportSchedule,
  saveCeoReportSchedule,
  shareCeoReportRun,
  toggleCeoReportSchedule,
} from "@/lib/ceo/services/ceo-reports-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  ceoReportDownloadSchema,
  ceoReportGenerateSchema,
  ceoReportRunIdSchema,
  ceoReportScheduleSchema,
  ceoReportScheduleToggleSchema,
  ceoReportShareSchema,
  ceoReportsListParamsSchema,
} from "@/lib/validations/ceo-reports";
import type {
  CeoReportLibraryResult,
  CeoReportPreview,
  CeoReportsActionResult,
  CeoReportsListParams,
  CeoReportsPageData,
} from "@/types/ceo-reports";

export async function getCeoReportsModuleData(
  params: CeoReportsListParams,
): Promise<CeoReportsPageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoReportsPageData(
    supabase,
    profile,
    ceoReportsListParamsSchema.parse(params),
  );
}

export async function fetchCeoReportsLibraryAction(
  params: CeoReportsListParams,
): Promise<CeoReportLibraryResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoReportLibrary(
    supabase,
    profile,
    ceoReportsListParamsSchema.parse(params),
  );
}

export async function fetchCeoReportsPageAction(
  params: CeoReportsListParams,
): Promise<CeoReportsPageData> {
  return getCeoReportsModuleData(params);
}

export async function fetchCeoReportPreviewAction(input: {
  runId: string;
}): Promise<{ success: true; data: CeoReportPreview } | { success: false; message: string }> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoReportRunIdSchema.parse(input);
    const data = await getCeoReportPreview(supabase, profile, parsed.runId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load preview.",
    };
  }
}

export async function generateCeoReportAction(input: unknown): Promise<CeoReportsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoReportGenerateSchema.parse(input);
    const result = await generateCeoReport(supabase, profile, parsed);
    return {
      success: true,
      message: result.message,
      runId: result.runId,
      filename: result.filename,
      mimeType: result.mimeType,
      contentBase64: result.contentBase64,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate report.",
    };
  }
}

export async function downloadCeoReportAction(input: unknown): Promise<CeoReportsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoReportDownloadSchema.parse(input);
    const result = await downloadCeoReportRun(
      supabase,
      profile,
      parsed.runId,
      parsed.format,
    );
    return {
      success: true,
      message: "Download ready.",
      filename: result.filename,
      mimeType: result.mimeType,
      contentBase64: result.contentBase64,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to download report.",
    };
  }
}

export async function shareCeoReportAction(input: unknown): Promise<CeoReportsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoReportShareSchema.parse(input);
    const result = await shareCeoReportRun(supabase, profile, parsed);
    return { success: true, message: result.message };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to share report.",
    };
  }
}

export async function saveCeoReportScheduleAction(input: unknown): Promise<CeoReportsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoReportScheduleSchema.parse(input);
    const scheduleId = await saveCeoReportSchedule(supabase, profile, parsed);
    return {
      success: true,
      message: parsed.scheduleId ? "Schedule updated." : "Schedule created.",
      runId: scheduleId,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save schedule.",
    };
  }
}

export async function toggleCeoReportScheduleAction(
  input: unknown,
): Promise<CeoReportsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoReportScheduleToggleSchema.parse(input);
    await toggleCeoReportSchedule(
      supabase,
      profile,
      parsed.scheduleId,
      parsed.isEnabled,
    );
    return {
      success: true,
      message: parsed.isEnabled ? "Schedule enabled." : "Schedule disabled.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update schedule.",
    };
  }
}

export async function deleteCeoReportScheduleAction(input: {
  scheduleId: string;
}): Promise<CeoReportsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    await removeCeoReportSchedule(supabase, profile, input.scheduleId);
    return { success: true, message: "Schedule deleted." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete schedule.",
    };
  }
}
