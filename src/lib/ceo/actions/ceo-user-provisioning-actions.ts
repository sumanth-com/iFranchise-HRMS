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
  inviteExecutiveUser,
  reactivateExecutiveUser,
  resendExecutiveInvitation,
} from "@/lib/ceo/services/ceo-user-provisioning-mutations";
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

  const [summary, users, lookups] = await Promise.all([
    getCeoProvisioningSummary(supabase, profile),
    listCeoProvisioningUsers(supabase, profile, parsed),
    getCeoProvisioningLookups(supabase, profile),
  ]);

  return {
    summary,
    users,
    lookups,
    inviteServiceReady: hasSupabaseServiceRoleEnv(),
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
