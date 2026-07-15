"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getCeoPayrollAnalytics,
  getCeoPayrollEmployeeDetail,
  getCeoPayrollInsights,
  getCeoPayrollKpis,
  getCeoPayrollOverview,
  getCeoPayrollPageData,
  listCeoPayrollDepartments,
  listCeoPayrollEmployees,
  listCeoPayrollHistory,
} from "@/lib/ceo/services/ceo-payroll-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  ceoPayrollEmployeeDetailSchema,
  ceoPayrollListParamsSchema,
} from "@/lib/validations/ceo-payroll";
import type {
  CeoPayrollAnalytics,
  CeoPayrollDepartmentRow,
  CeoPayrollEmployeeDetail,
  CeoPayrollEmployeeListResult,
  CeoPayrollHistoryRow,
  CeoPayrollInsights,
  CeoPayrollKpis,
  CeoPayrollListParams,
  CeoPayrollOverview,
  CeoPayrollPageData,
} from "@/types/ceo-payroll";

export async function getCeoPayrollModuleData(
  params: CeoPayrollListParams,
): Promise<CeoPayrollPageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPayrollPageData(
    supabase,
    profile,
    ceoPayrollListParamsSchema.parse(params),
  );
}

export async function fetchCeoPayrollKpisAction(
  params: CeoPayrollListParams,
): Promise<CeoPayrollKpis> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPayrollKpis(
    supabase,
    profile,
    ceoPayrollListParamsSchema.parse(params),
  );
}

export async function fetchCeoPayrollOverviewAction(
  params: CeoPayrollListParams,
): Promise<CeoPayrollOverview> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPayrollOverview(
    supabase,
    profile,
    ceoPayrollListParamsSchema.parse(params),
  );
}

export async function fetchCeoPayrollEmployeesAction(
  params: CeoPayrollListParams,
): Promise<CeoPayrollEmployeeListResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoPayrollEmployees(
    supabase,
    profile,
    ceoPayrollListParamsSchema.parse(params),
  );
}

export async function fetchCeoPayrollAnalyticsAction(
  params: CeoPayrollListParams,
): Promise<CeoPayrollAnalytics> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPayrollAnalytics(
    supabase,
    profile,
    ceoPayrollListParamsSchema.parse(params),
  );
}

export async function fetchCeoPayrollDepartmentsAction(
  params: CeoPayrollListParams,
): Promise<CeoPayrollDepartmentRow[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoPayrollDepartments(
    supabase,
    profile,
    ceoPayrollListParamsSchema.parse(params),
  );
}

export async function fetchCeoPayrollHistoryAction(
  params: CeoPayrollListParams,
): Promise<CeoPayrollHistoryRow[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return listCeoPayrollHistory(
    supabase,
    profile,
    ceoPayrollListParamsSchema.parse(params),
  );
}

export async function fetchCeoPayrollInsightsAction(
  params: CeoPayrollListParams,
): Promise<CeoPayrollInsights> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoPayrollInsights(
    supabase,
    profile,
    ceoPayrollListParamsSchema.parse(params),
  );
}

export async function fetchCeoPayrollEmployeeDetailAction(input: {
  employeeId: string;
  payrollItemId?: string;
  month?: number;
  year?: number;
}): Promise<
  | { success: true; data: CeoPayrollEmployeeDetail }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoPayrollEmployeeDetailSchema.parse(input);
    const data = await getCeoPayrollEmployeeDetail(supabase, profile, parsed);
    if (!data) return { success: false, message: "Employee payroll record not found." };
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load employee payroll details.",
    };
  }
}
