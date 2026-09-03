"use server";

import { revalidateSelfAttendancePaths } from "@/lib/attendance/actions/self-attendance-punch-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getManagerProfilePageData,
  punchManagerAttendance,
  requestManagerAttendanceRegularization,
  updateManagerCheckout,
} from "@/lib/manager/services/manager-self-attendance-service";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  managerAttendancePunchSchema,
  managerAttendanceRegularizationSchema,
  managerProfilePageParamsSchema,
  managerUpdateCheckoutSchema,
  type ManagerAttendancePunchInput,
  type ManagerAttendanceRegularizationInput,
  type ManagerProfilePageParams,
  type ManagerUpdateCheckoutInput,
} from "@/lib/validations/manager-self-attendance";
import type { ManagerProfilePageData, ManagerTodayAttendance } from "@/types/manager-self-attendance";

async function getContext() {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const supabase = await createClient();
  return { profile, supabase };
}

export async function getManagerProfilePageDataAction(
  params: Partial<ManagerProfilePageParams> = {},
): Promise<ManagerProfilePageData> {
  const parsed = managerProfilePageParamsSchema.parse(params);
  const { profile, supabase } = await getContext();
  return getManagerProfilePageData(supabase, profile, parsed);
}

export async function punchManagerAttendanceAction(
  input: ManagerAttendancePunchInput,
): Promise<{ success: true; today: ManagerTodayAttendance } | { success: false; error: string }> {
  try {
    const parsed = managerAttendancePunchSchema.parse(input);
    const { profile, supabase } = await getContext();
    const today = await punchManagerAttendance(supabase, profile, parsed);
    revalidateSelfAttendancePaths();
    return { success: true, today };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update attendance",
    };
  }
}

export async function updateManagerCheckoutAction(
  input: ManagerUpdateCheckoutInput = {},
): Promise<{ success: true; today: ManagerTodayAttendance } | { success: false; error: string }> {
  try {
    const parsed = managerUpdateCheckoutSchema.parse(input);
    const { profile, supabase } = await getContext();
    const today = await updateManagerCheckout(supabase, profile, parsed);
    revalidateSelfAttendancePaths();
    return { success: true, today };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update checkout",
    };
  }
}

export async function requestManagerAttendanceRegularizationAction(
  input: ManagerAttendanceRegularizationInput,
): Promise<
  { success: true; correctionId: string } | { success: false; error: string }
> {
  try {
    const parsed = managerAttendanceRegularizationSchema.parse(input);
    const { profile, supabase } = await getContext();
    const correctionId = await requestManagerAttendanceRegularization(
      supabase,
      profile,
      parsed,
    );
    revalidateSelfAttendancePaths();
    return { success: true, correctionId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to submit regularization request",
    };
  }
}
