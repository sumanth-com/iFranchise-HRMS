import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { ONBOARDING_PERMISSIONS } from "@/lib/onboarding/constants";
import {
  getOnboardingCaseDetail,
  getOnboardingCaseRouteRef,
  getOnboardingDashboardStats,
  getOnboardingLookups,
  listOnboardingCases,
  resolveOnboardingCaseId,
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
  PORTAL_PERMISSIONS.ceo,
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

export async function loadOnboardingCaseDetail(routeRef: string): Promise<OnboardingCaseDetail> {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const organizationId = profile.employee.organizationId;
  const caseId = await resolveOnboardingCaseId(supabase, organizationId, routeRef);
  return getOnboardingCaseDetail(supabase, organizationId, caseId);
}

export async function loadOnboardingReviewPageData(routeRef: string) {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const organizationId = profile.employee.organizationId;
  const caseId = await resolveOnboardingCaseId(supabase, organizationId, routeRef);
  const [detail, lookups, routeRefCanonical] = await Promise.all([
    getOnboardingCaseDetail(supabase, organizationId, caseId),
    getOnboardingLookups(supabase, organizationId),
    getOnboardingCaseRouteRef(supabase, organizationId, caseId),
  ]);
  return { detail, roles: lookups.roles, routeRef: routeRefCanonical };
}
