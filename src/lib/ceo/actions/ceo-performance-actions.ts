"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getCeoPerformanceEmployeeDetail,
  getCeoPerformanceInsights,
  getCeoPerformanceKpis,
  getCeoPerformanceLowPerformance,
  getCeoPerformanceOverview,
  getCeoPerformancePageData,
  getCeoPerformancePromotionOverview,
  getCeoPerformanceTopPerformers,
  listCeoPerformanceDepartments,
  listCeoPerformanceEmployees,
} from "@/lib/ceo/services/ceo-performance-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  ceoPerformanceEmployeeIdSchema,
  ceoPerformanceListParamsSchema,
} from "@/lib/validations/ceo-performance";
import type {
  CeoPerformanceDepartmentRow,
  CeoPerformanceEmployeeDetail,
  CeoPerformanceEmployeeListResult,
  CeoPerformanceInsights,
  CeoPerformanceKpis,
  CeoPerformanceListParams,
  CeoPerformanceLowPerformance,
  CeoPerformanceOverview,
  CeoPerformancePageData,
  CeoPerformancePromotionOverview,
  CeoPerformanceTopPerformers,
} from "@/types/ceo-performance";

export async function getCeoPerformanceModuleData(
  params: CeoPerformanceListParams,
): Promise<CeoPerformancePageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoPerformanceListParamsSchema.parse(params);
  return getCeoPerformancePageData(supabase, profile, parsed);
}

export async function fetchCeoPerformanceKpisAction(
  params: CeoPerformanceListParams,
): Promise<CeoPerformanceKpis> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPerformanceKpis(
    supabase,
    profile,
    ceoPerformanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoPerformanceOverviewAction(
  params: CeoPerformanceListParams,
): Promise<CeoPerformanceOverview> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPerformanceOverview(
    supabase,
    profile,
    ceoPerformanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoPerformanceDepartmentsAction(
  params: CeoPerformanceListParams,
): Promise<CeoPerformanceDepartmentRow[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoPerformanceDepartments(
    supabase,
    profile,
    ceoPerformanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoPerformanceEmployeesAction(
  params: CeoPerformanceListParams,
): Promise<CeoPerformanceEmployeeListResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoPerformanceEmployees(
    supabase,
    profile,
    ceoPerformanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoPerformanceTopPerformersAction(
  params: CeoPerformanceListParams,
): Promise<CeoPerformanceTopPerformers> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPerformanceTopPerformers(
    supabase,
    profile,
    ceoPerformanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoPerformanceLowPerformanceAction(
  params: CeoPerformanceListParams,
): Promise<CeoPerformanceLowPerformance> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPerformanceLowPerformance(
    supabase,
    profile,
    ceoPerformanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoPerformanceInsightsAction(
  params: CeoPerformanceListParams,
): Promise<CeoPerformanceInsights> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPerformanceInsights(
    supabase,
    profile,
    ceoPerformanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoPerformancePromotionsAction(
  params: CeoPerformanceListParams,
): Promise<CeoPerformancePromotionOverview> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPerformancePromotionOverview(
    supabase,
    profile,
    ceoPerformanceListParamsSchema.parse(params),
  );
}

export async function fetchCeoPerformanceEmployeeDetailAction(
  employeeId: string,
): Promise<
  | { success: true; data: CeoPerformanceEmployeeDetail }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoPerformanceEmployeeIdSchema.parse({ employeeId });
    const data = await getCeoPerformanceEmployeeDetail(
      supabase,
      profile,
      parsed.employeeId,
    );
    if (!data) return { success: false, message: "Employee not found." };
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load employee performance profile.",
    };
  }
}
