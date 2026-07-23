"use server";

import { revalidatePath } from "next/cache";

import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import {
  getSystemSettings,
  updateSystemSettings,
} from "@/lib/system-admin/services/system-settings";
import { createClient } from "@/lib/supabase/server";

function revalidateSystemAdmin() {
  for (const route of Object.values(SYSTEM_ADMIN_ROUTES)) {
    revalidatePath(route);
  }
}

export async function fetchSystemSettingsAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const settings = await getSystemSettings(supabase, profile.employee.organizationId);
    return { success: true as const, data: settings };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load settings",
    };
  }
}

export async function updateMaintenanceModeAction(
  enabled: boolean,
  message?: string | null,
) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
      maintenanceMode: enabled,
      maintenanceMessage: message ?? null,
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update maintenance mode",
    };
  }
}

export async function updateFeatureFlagsAction(flags: Record<string, boolean>) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const current = await getSystemSettings(supabase, profile.employee.organizationId);
    await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
      featureFlags: { ...current.featureFlags, ...flags },
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update feature flags",
    };
  }
}

export async function updateEnvironmentLabelAction(label: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
      environmentLabel: label.trim(),
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update environment",
    };
  }
}
