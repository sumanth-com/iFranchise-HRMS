"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  userProvisioningPaths,
} from "@/lib/user-provisioning/constants";
import {
  getCeoProvisioningLookups,
  getCeoProvisioningSummary,
  getCeoProvisioningUserDetail,
  listCeoProvisioningUsers,
} from "@/lib/ceo/services/ceo-user-provisioning-queries";
import {
  cancelExecutiveInvitation,
  deactivateExecutiveUser,
  deleteProvisioningUser,
  inviteExecutiveUser,
  reactivateExecutiveUser,
  resendExecutiveInvitation,
} from "@/lib/ceo/services/ceo-user-provisioning-mutations";
import { listProvisioningEligibleOnboardingCandidates } from "@/lib/onboarding/services/onboarding-provisioning-queries";
import { provisionOnboardingCandidate } from "@/lib/onboarding/services/onboarding-provisioning-mutations";
import {
  requireServerAnyPermission,
} from "@/lib/permissions/server";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type {
  CeoProvisioningListParams,
  CeoProvisioningListResult,
  CeoProvisioningUserDetail,
  CeoUserProvisioningPageData,
} from "@/types/ceo-user-provisioning";
import {
  ceoProvisioningListParamsSchema,
  inviteExecutiveUserSchema,
} from "@/lib/validations/ceo-user-provisioning";
import { provisionOnboardingCandidateSchema } from "@/lib/validations/onboarding-provisioning";
import type { ProvisioningEligibleCandidate } from "@/lib/onboarding/provisioning-eligibility";

const VIEW_PERMISSIONS = [
  PORTAL_PERMISSIONS.ceo,
  PORTAL_PERMISSIONS.hr,
  "user_provisioning.view",
  "user_provisioning.manage",
];
const MANAGE_PERMISSIONS = [
  PORTAL_PERMISSIONS.ceo,
  PORTAL_PERMISSIONS.hr,
  "user_provisioning.manage",
];

function revalidateUserProvisioning() {
  for (const path of userProvisioningPaths()) {
    revalidatePath(path);
  }
}

type ActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function getCeoUserProvisioningModuleData(
  params: CeoProvisioningListParams,
): Promise<CeoUserProvisioningPageData> {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const parsed = ceoProvisioningListParamsSchema.parse(params);

  const [summary, users, lookups, eligibleOnboardingCandidates] = await Promise.all([
    getCeoProvisioningSummary(supabase, profile),
    listCeoProvisioningUsers(supabase, profile, parsed),
    getCeoProvisioningLookups(supabase, profile),
    listProvisioningEligibleOnboardingCandidates(supabase, profile),
  ]);

  return {
    summary,
    users,
    lookups,
    inviteServiceReady: hasSupabaseServiceRoleEnv(),
    eligibleOnboardingCandidates,
  };
}

export async function fetchCeoProvisioningUsersAction(
  params: CeoProvisioningListParams,
): Promise<CeoProvisioningListResult> {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const parsed = ceoProvisioningListParamsSchema.parse(params);
  return listCeoProvisioningUsers(supabase, profile, parsed);
}

export async function fetchUserProvisioningInviteRolesAction(): Promise<
  | { success: true; roles: CeoUserProvisioningPageData["lookups"]["roles"] }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const lookups = await getCeoProvisioningLookups(supabase, profile);
    return { success: true, roles: lookups.roles };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load invite roles.",
    };
  }
}

export async function fetchCeoProvisioningUserDetailAction(
  employeeId: string,
): Promise<
  | { success: true; data: CeoProvisioningUserDetail }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const data = await getCeoProvisioningUserDetail(supabase, profile, employeeId);
    if (!data) return { success: false, message: "Executive user not found." };
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load user details.",
    };
  }
}

export async function fetchProvisioningEligibleCandidatesAction(): Promise<
  | { success: true; candidates: ProvisioningEligibleCandidate[] }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const candidates = await listProvisioningEligibleOnboardingCandidates(supabase, profile);
    return { success: true, candidates };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load onboarding candidates.",
    };
  }
}

export async function provisionOnboardingCandidateAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    if (!hasSupabaseServiceRoleEnv()) {
      return {
        success: false,
        message:
          "User provisioning is not configured on this environment. Contact your administrator.",
      };
    }

    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = provisionOnboardingCandidateSchema.parse(input);

    const result = await provisionOnboardingCandidate(supabase, profile, parsed);
    revalidateUserProvisioning();
    revalidatePath("/dashboard/recruitment/onboarding", "layout");
    revalidatePath("/dashboard/onboarding", "layout");

    return {
      success: true,
      message: `${result.fullName} is provisioned. Portal access email sent to ${result.companyEmail}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to provision candidate.";
    if (message.toLowerCase().includes("duplicate key")) {
      return { success: false, message: "This company email is already in use." };
    }
    return { success: false, message };
  }
}

export async function inviteExecutiveUserAction(input: unknown): Promise<ActionResult> {
  try {
    if (!hasSupabaseServiceRoleEnv()) {
      return {
        success: false,
        message:
          "User invitations are not configured on this environment. Contact your administrator.",
      };
    }

    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = inviteExecutiveUserSchema.parse(input);

    await inviteExecutiveUser(supabase, profile, parsed);
    revalidateUserProvisioning();

    return {
      success: true,
      message: `Invitation sent to ${parsed.email}. They will receive an email to activate their account.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send invitation.",
    };
  }
}

async function runManageAction(
  employeeId: string,
  handler: (
    supabase: Awaited<ReturnType<typeof createClient>>,
    profile: Awaited<ReturnType<typeof requireServerAnyPermission>>,
    employeeId: string,
  ) => Promise<void>,
  successMessage: string,
  requireService = false,
): Promise<ActionResult> {
  try {
    if (requireService && !hasSupabaseServiceRoleEnv()) {
      return {
        success: false,
        message:
          "This action is not configured on this environment. Contact your administrator.",
      };
    }
    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    await handler(supabase, profile, employeeId);
    revalidateUserProvisioning();
    return { success: true, message: successMessage };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Action failed.",
    };
  }
}

export async function resendProvisioningInvitationAction(
  employeeId: string,
): Promise<ActionResult> {
  return runManageAction(
    employeeId,
    resendExecutiveInvitation,
    "Invitation resent successfully.",
    true,
  );
}

export async function cancelProvisioningInvitationAction(
  employeeId: string,
): Promise<ActionResult> {
  return runManageAction(
    employeeId,
    cancelExecutiveInvitation,
    "Invitation cancelled.",
    true,
  );
}

export async function deleteProvisioningUserAction(
  employeeId: string,
): Promise<ActionResult> {
  return runManageAction(
    employeeId,
    deleteProvisioningUser,
    "User deleted successfully.",
    true,
  );
}

export async function deactivateProvisioningUserAction(
  employeeId: string,
): Promise<ActionResult> {
  return runManageAction(
    employeeId,
    deactivateExecutiveUser,
    "Account deactivated.",
    true,
  );
}

export async function reactivateProvisioningUserAction(
  employeeId: string,
): Promise<ActionResult> {
  return runManageAction(
    employeeId,
    reactivateExecutiveUser,
    "Account reactivated.",
    true,
  );
}
