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

  const eligible: ProvisioningEligibleCandidate[] = [];

  for (const row of data ?? []) {
    const caseId = row.id as string;
    try {
      const detail = await getOnboardingCaseDetail(supabase, organizationId, caseId);
      await assertOnboardingProvisioningEligible(detail);
      eligible.push(mapDetailToEligibleCandidate(detail));
    } catch {
      // Skip cases that fail eligibility (stale list / incomplete data).
    }
  }

  return eligible;
}
