import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  resolveManagerDepartmentIds,
  isManagerOnlyProfile,
} from "@/lib/manager/portal-scope";
import { ONBOARDING_PERMISSIONS } from "@/lib/onboarding/constants";
import {
  getOnboardingCaseDetail,
  getOnboardingCaseRouteRef,
  getOnboardingDashboardStats,
  getOnboardingLookups,
  listOnboardingCases,
  listOnboardingDesignationFilters,
  resolveOnboardingCaseId,
} from "@/lib/onboarding/services/onboarding-queries";
import { syncOnboardingCasesFromSentOffers } from "@/lib/onboarding/services/onboarding-mutations";
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
  designationFilters: { id: string; title: string }[];
};

const VIEW_PERMISSIONS = [
  ONBOARDING_PERMISSIONS.view,
  ONBOARDING_PERMISSIONS.manage,
  ONBOARDING_PERMISSIONS.review,
  ONBOARDING_PERMISSIONS.activate,
  PORTAL_PERMISSIONS.ceo,
  PORTAL_PERMISSIONS.manager,
];

async function resolveOnboardingDepartmentScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Awaited<ReturnType<typeof requireServerAnyPermission>>,
) {
  if (!isManagerOnlyProfile(profile)) return null;
  const departmentIds = await resolveManagerDepartmentIds(supabase, profile);
  return departmentIds?.length ? departmentIds : [];
}

async function assertManagerOnboardingCaseAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Awaited<ReturnType<typeof requireServerAnyPermission>>,
  organizationId: string,
  caseId: string,
) {
  const departmentIds = await resolveOnboardingDepartmentScope(supabase, profile);
  if (departmentIds === null) return;

  const { data, error } = await supabase
    .schema("hrms")
    .from("onboarding_cases")
    .select("department_id")
    .eq("id", caseId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (
    !data?.department_id ||
    !departmentIds.includes(String(data.department_id))
  ) {
    throw new Error("Onboarding case not found");
  }
}

function scopeOnboardingLookups(
  lookups: OnboardingLookups,
  departmentIds: string[] | null,
): OnboardingLookups {
  if (!departmentIds) return lookups;
  const allowed = new Set(departmentIds);
  return {
    ...lookups,
    departments: lookups.departments.filter((department) => allowed.has(department.id)),
  };
}

export async function loadOnboardingModuleData(
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    designationId?: string;
    joiningMonth?: number;
    joiningYear?: number;
  },
): Promise<OnboardingModuleData> {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const parsed = onboardingListParamsSchema.parse(params);
  const organizationId = profile.employee.organizationId;
  const departmentIds = await resolveOnboardingDepartmentScope(supabase, profile);
  const listParams = {
    ...parsed,
    departmentIds: departmentIds ?? undefined,
  };

  await syncOnboardingCasesFromSentOffers(supabase, profile);

  const [stats, cases, lookups, designationFilters] = await Promise.all([
    getOnboardingDashboardStats(supabase, organizationId, departmentIds ?? undefined),
    listOnboardingCases(supabase, organizationId, listParams),
    getOnboardingLookups(supabase, organizationId),
    listOnboardingDesignationFilters(supabase, organizationId, departmentIds ?? undefined),
  ]);

  return {
    stats,
    cases,
    lookups: scopeOnboardingLookups(lookups, departmentIds),
    designationFilters,
  };
}

export async function loadOnboardingCaseDetail(routeRef: string): Promise<OnboardingCaseDetail> {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const organizationId = profile.employee.organizationId;
  const caseId = await resolveOnboardingCaseId(supabase, organizationId, routeRef);
  await assertManagerOnboardingCaseAccess(supabase, profile, organizationId, caseId);
  return getOnboardingCaseDetail(supabase, organizationId, caseId);
}

export async function loadOnboardingReviewPageData(routeRef: string) {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const organizationId = profile.employee.organizationId;
  const caseId = await resolveOnboardingCaseId(supabase, organizationId, routeRef);
  await assertManagerOnboardingCaseAccess(supabase, profile, organizationId, caseId);
  const [detail, routeRefCanonical] = await Promise.all([
    getOnboardingCaseDetail(supabase, organizationId, caseId),
    getOnboardingCaseRouteRef(supabase, organizationId, caseId),
  ]);
  return {
    detail,
    routeRef: routeRefCanonical,
  };
}
