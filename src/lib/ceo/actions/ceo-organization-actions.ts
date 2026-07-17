"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getCeoOrgEmployeeDetail,
  getCeoOrganizationPageData,
  getCeoOrgSummary,
  getCeoOrgWorkforceInsights,
  getCeoOrgDepartments,
  listCeoOrgEmployees,
} from "@/lib/ceo/services/ceo-organization-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  ceoOrgEmployeeIdSchema,
  ceoOrgListParamsSchema,
} from "@/lib/validations/ceo-organization";
import type {
  CeoOrgDepartmentCard,
  CeoOrgEmployeeDetail,
  CeoOrgListParams,
  CeoOrgListResult,
  CeoOrganizationPageData,
  CeoOrgSummary,
  CeoOrgWorkforceInsights,
} from "@/types/ceo-organization";

export async function getCeoOrganizationModuleData(
  params: CeoOrgListParams,
): Promise<CeoOrganizationPageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoOrgListParamsSchema.parse(params);
  return getCeoOrganizationPageData(supabase, profile, parsed);
}

export async function fetchCeoOrgEmployeesAction(
  params: CeoOrgListParams,
): Promise<CeoOrgListResult> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  const parsed = ceoOrgListParamsSchema.parse(params);
  return listCeoOrgEmployees(supabase, profile, parsed);
}

export async function fetchCeoOrgSummaryAction(): Promise<CeoOrgSummary> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoOrgSummary(supabase, profile);
}

export async function fetchCeoOrgDepartmentsAction(
  departmentId?: string,
): Promise<CeoOrgDepartmentCard[]> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoOrgDepartments(supabase, profile, departmentId);
}

export async function fetchCeoOrgInsightsAction(
  departmentId?: string,
  employmentTypeId?: string,
): Promise<CeoOrgWorkforceInsights> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoOrgWorkforceInsights(supabase, profile, departmentId, employmentTypeId);
}

export async function fetchCeoOrgEmployeeDetailAction(
  employeeId: string,
): Promise<{ success: true; data: CeoOrgEmployeeDetail } | { success: false; message: string }> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoOrgEmployeeIdSchema.parse({ employeeId });
    const data = await getCeoOrgEmployeeDetail(supabase, profile, parsed.employeeId);
    if (!data) {
      return { success: false, message: "Employee not found." };
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load employee profile.",
    };
  }
}
