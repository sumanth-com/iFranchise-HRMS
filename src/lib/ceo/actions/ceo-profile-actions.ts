"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  buildCeoProfileDownload,
  changeCeoPassword,
  getCeoProfilePageData,
  removeCeoProfileImage,
  revokeCeoSession,
  saveCeoAlertPreferences,
  saveCeoUserPreferences,
  signOutOtherCeoSessions,
  toggleCeoMfa,
  updateCeoPersonalProfile,
  uploadCeoProfileImage,
  verifyCeoMfaEnrollment,
} from "@/lib/ceo/services/ceo-profile-queries";
import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/employees/constants";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  ceoAlertPreferencesSchema,
  ceoChangePasswordSchema,
  ceoMfaToggleSchema,
  ceoProfilePersonalSchema,
  ceoProfilePreferencesSchema,
  ceoSessionIdSchema,
} from "@/lib/validations/ceo-profile";
import type { CeoProfileActionResult, CeoProfilePageData } from "@/types/ceo-profile";
import { z } from "zod";

function revalidateCeoProfile() {
  revalidatePath(CEO_ROUTES.profile);
  revalidatePath("/", "layout");
}

export async function getCeoProfileModuleData(): Promise<CeoProfilePageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoProfilePageData(supabase, profile);
}

export async function fetchCeoProfilePageAction(): Promise<CeoProfilePageData> {
  return getCeoProfileModuleData();
}

export async function updateCeoPersonalProfileAction(
  input: unknown,
): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoProfilePersonalSchema.parse(input);
    await updateCeoPersonalProfile(supabase, profile, parsed);
    revalidateCeoProfile();
    return { success: true, message: "Profile updated." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update profile",
    };
  }
}

export async function saveCeoPreferencesAction(
  input: unknown,
): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoProfilePreferencesSchema.parse(input);
    await saveCeoUserPreferences(supabase, profile, parsed);
    revalidateCeoProfile();
    return { success: true, message: "Preferences saved." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save preferences",
    };
  }
}

export async function saveCeoAlertPreferencesAction(
  input: unknown,
): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoAlertPreferencesSchema.parse(input);
    await saveCeoAlertPreferences(supabase, profile, parsed);
    revalidateCeoProfile();
    return { success: true, message: "Notification preferences saved." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save notification preferences",
    };
  }
}

export async function changeCeoPasswordAction(
  input: unknown,
): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoChangePasswordSchema.parse(input);
    await changeCeoPassword(
      supabase,
      profile,
      parsed.currentPassword,
      parsed.newPassword,
    );
    revalidateCeoProfile();
    return { success: true, message: "Password changed successfully." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to change password",
    };
  }
}

export async function revokeCeoSessionAction(
  input: unknown,
): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoSessionIdSchema.parse(input);
    await revokeCeoSession(supabase, profile, parsed.sessionId);
    revalidateCeoProfile();
    return { success: true, message: "Session revoked." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to revoke session",
    };
  }
}

export async function signOutOtherCeoSessionsAction(): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    await signOutOtherCeoSessions(supabase, profile);
    revalidateCeoProfile();
    return { success: true, message: "Other sessions signed out." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to sign out other sessions",
    };
  }
}

export async function toggleCeoMfaAction(
  input: unknown,
): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoMfaToggleSchema.parse(input);
    const result = await toggleCeoMfa(supabase, profile, parsed.enable);
    revalidateCeoProfile();
    return {
      success: true,
      message: result.message,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update 2FA",
    };
  }
}

export async function verifyCeoMfaAction(
  input: unknown,
): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = z
      .object({
        factorId: z.string().min(1),
        code: z.string().min(6).max(10),
      })
      .parse(input);
    await verifyCeoMfaEnrollment(
      supabase,
      profile,
      parsed.factorId,
      parsed.code,
    );
    revalidateCeoProfile();
    return { success: true, message: "Two-factor authentication enabled." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to verify 2FA code",
    };
  }
}

export async function downloadCeoProfileAction(): Promise<
  CeoProfileActionResult & {
    filename?: string;
    mimeType?: string;
    contentBase64?: string;
  }
> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const data = await getCeoProfilePageData(supabase, profile);
    const file = buildCeoProfileDownload(data);
    const contentBase64 = Buffer.from(file.content, "utf8").toString("base64");
    return {
      success: true,
      message: "Profile export ready.",
      filename: file.filename,
      mimeType: file.mimeType,
      contentBase64,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to export profile",
    };
  }
}

export async function uploadCeoProfileImageAction(
  formData: FormData,
): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, message: "No file provided" };
    }
    if (!file.type.startsWith("image/")) {
      return { success: false, message: "Please select an image file" };
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      return { success: false, message: "Profile image must be 10 MB or smaller" };
    }

    const supabase = await createClient();
    await uploadCeoProfileImage(supabase, profile, file);
    revalidateCeoProfile();
    return { success: true, message: "Profile photo updated." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload photo",
    };
  }
}

export async function removeCeoProfileImageAction(): Promise<CeoProfileActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const data = await getCeoProfilePageData(supabase, profile);
    await removeCeoProfileImage(supabase, profile, data.profile.profileImagePath);
    revalidateCeoProfile();
    return { success: true, message: "Profile photo removed." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to remove photo",
    };
  }
}
