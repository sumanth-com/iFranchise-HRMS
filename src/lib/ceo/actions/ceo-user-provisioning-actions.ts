"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  userProvisioningPaths,
} from "@/lib/user-provisioning/constants";
import {
  cancelExecutiveInvitation,
  changePendingProvisioningRole,
  deactivateExecutiveUser,
  deleteProvisioningUser,
  inviteExecutiveUser,
  inviteExistingEmployeeToPortal,
  reactivateExecutiveUser,
  resendExecutiveInvitation,
  updatePendingProvisioningUser,
} from "@/lib/ceo/services/ceo-user-provisioning-mutations";
import {
  getCeoProvisioningLookups,
  getCeoProvisioningSummary,
  getCeoProvisioningUserDetail,
  listCeoProvisioningUsers,
  listPortalInviteEligibleEmployees,
} from "@/lib/ceo/services/ceo-user-provisioning-queries";
import { listProvisioningEligibleOnboardingCandidates } from "@/lib/onboarding/services/onboarding-provisioning-queries";
import { provisionOnboardingCandidate } from "@/lib/onboarding/services/onboarding-provisioning-mutations";
import {
  requireServerAnyPermission,
} from "@/lib/permissions/server";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { looksLikeTechnicalAuthError } from "@/lib/auth/errors";
import type {
  CeoProvisioningListParams,
  CeoProvisioningListResult,
  CeoProvisioningUserDetail,
  CeoUserProvisioningPageData,
  PortalInviteEligibleEmployee,
} from "@/types/ceo-user-provisioning";
import {
  ceoProvisioningListParamsSchema,
  changeProvisioningRoleSchema,
  inviteExecutiveUserSchema,
  inviteExistingEmployeeSchema,
  updatePendingProvisioningUserSchema,
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

function toProvisioningErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return fallback;
  if (looksLikeTechnicalAuthError(message)) return fallback;
  if (message.length > 180) return fallback;
  return message;
}

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
    const message = toProvisioningErrorMessage(
      error,
      "Unable to send invitation. Please try again.",
    );
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
      message: toProvisioningErrorMessage(error, "Unable to send invitation. Please try again."),
    };
  }
}

export async function inviteExistingEmployeeAction(input: unknown): Promise<ActionResult> {
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
    const parsed = inviteExistingEmployeeSchema.parse(input);
    const result = await inviteExistingEmployeeToPortal(supabase, profile, parsed);
    revalidateUserProvisioning();

    return {
      success: true,
      message: `Invitation sent to ${result.email}. Existing employee record ${result.fullName} was linked — no duplicate employee was created.`,
    };
  } catch (error) {
    return {
      success: false,
      message: toProvisioningErrorMessage(error, "Unable to send invitation. Please try again."),
    };
  }
}

export async function fetchPortalInviteEligibleEmployeesAction(
  search?: string,
): Promise<
  | { success: true; employees: PortalInviteEligibleEmployee[] }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const employees = await listPortalInviteEligibleEmployees(supabase, profile, search);
    return { success: true, employees };
  } catch (error) {
    return {
      success: false,
      message: toProvisioningErrorMessage(error, "Unable to load employees. Please try again."),
    };
  }
}

export async function changePendingProvisioningRoleAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = changeProvisioningRoleSchema.parse(input);
    await changePendingProvisioningRole(supabase, profile, parsed);
    revalidateUserProvisioning();
    return { success: true, message: "Role updated for this pending invitation." };
  } catch (error) {
    return {
      success: false,
      message: toProvisioningErrorMessage(error, "Unable to update role. Please try again."),
    };
  }
}

export async function updatePendingProvisioningUserAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const profile = await requireServerAnyPermission(MANAGE_PERMISSIONS);
    const supabase = await createClient();
    const parsed = updatePendingProvisioningUserSchema.parse(input);
    await updatePendingProvisioningUser(supabase, profile, parsed);
    revalidateUserProvisioning();
    return { success: true, message: "Pending user details updated." };
  } catch (error) {
    return {
      success: false,
      message: toProvisioningErrorMessage(error, "Unable to update user. Please try again."),
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
      message: toProvisioningErrorMessage(error, "Action failed. Please try again."),
    };
  }
}

export async function resendProvisioningInvitationAction(
  employeeId: string,
): Promise<ActionResult> {
  return runManageAction(
    employeeId,
    resendExecutiveInvitation,
    "Invitation resent successfully. The previous invitation link is no longer valid.",
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
