import { ONBOARDING_PERMISSIONS } from "@/lib/onboarding/constants";
import {
  getOnboardingCaseDetail,
  getOnboardingDashboardStats,
  getOnboardingLookups,
  listOnboardingCases,
} from "@/lib/onboarding/services/onboarding-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type {
  OnboardingCaseDetail,
  OnboardingCaseListItem,
  OnboardingDashboardStats,
  OnboardingLookups,
} from "@/types/onboarding";
import { onboardingListParamsSchema } from "@/lib/validations/onboarding";

export type OnboardingModuleData = {
  stats: OnboardingDashboardStats;
  cases: { data: OnboardingCaseListItem[]; total: number };
  lookups: OnboardingLookups;
};

const VIEW_PERMISSIONS = [
  ONBOARDING_PERMISSIONS.view,
  ONBOARDING_PERMISSIONS.manage,
  ONBOARDING_PERMISSIONS.review,
  ONBOARDING_PERMISSIONS.activate,
];

export async function loadOnboardingModuleData(
  params: { page?: number; pageSize?: number; search?: string; status?: string },
): Promise<OnboardingModuleData> {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const parsed = onboardingListParamsSchema.parse(params);
  const organizationId = profile.employee.organizationId;

  const [stats, cases, lookups] = await Promise.all([
    getOnboardingDashboardStats(supabase, organizationId),
    listOnboardingCases(supabase, organizationId, parsed),
    getOnboardingLookups(supabase, organizationId),
  ]);

  return { stats, cases, lookups };
}

export async function loadOnboardingCaseDetail(caseId: string): Promise<OnboardingCaseDetail> {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  return getOnboardingCaseDetail(supabase, profile.employee.organizationId, caseId);
}

export async function loadOnboardingReviewPageData(caseId: string) {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const organizationId = profile.employee.organizationId;
  const [detail, lookups] = await Promise.all([
    getOnboardingCaseDetail(supabase, organizationId, caseId),
    getOnboardingLookups(supabase, organizationId),
  ]);
  return { detail, roles: lookups.roles };
}
