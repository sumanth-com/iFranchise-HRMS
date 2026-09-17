import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";

import {
  assertOnboardingProvisioningEligible,
  mapDetailToEligibleCandidate,
  type ProvisioningEligibleCandidate,
} from "@/lib/onboarding/provisioning-eligibility";
import { getOnboardingCaseDetail } from "@/lib/onboarding/services/onboarding-queries";

export async function listProvisioningEligibleOnboardingCandidates(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ProvisioningEligibleCandidate[]> {
  const organizationId = profile.employee.organizationId;
  const admin = createAdminClient();

  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "pending_hr_review")
    .is("employee_id", null)
    .not("submitted_at", "is", null)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);

  const caseIds = (data ?? []).map((row) => row.id as string);
  if (caseIds.length === 0) return [];

  // Batch portal-ready checks once instead of per-case sequential lookups.
  const { data: portalAccounts, error: portalError } = await admin
    .schema("hrms")
    .from("onboarding_portal_accounts")
    .select("case_id, auth_user_id")
    .in("case_id", caseIds);
  if (portalError) throw new Error(portalError.message);

  const portalReadyByCase = new Set(
    (portalAccounts ?? [])
      .filter((row) => Boolean(row.auth_user_id))
      .map((row) => row.case_id as string),
  );

  const settled = await Promise.all(
    caseIds.map(async (caseId) => {
      try {
        if (!portalReadyByCase.has(caseId)) return null;
        // Eligibility only needs document metadata — skip storage signed URLs.
        const detail = await getOnboardingCaseDetail(supabase, organizationId, caseId, {
          includeDocumentSignedUrls: false,
        });
        await assertOnboardingProvisioningEligible(detail, { portalReady: true });
        return mapDetailToEligibleCandidate(detail);
      } catch {
        return null;
      }
    }),
  );

  return settled.filter((row): row is ProvisioningEligibleCandidate => Boolean(row));
}
