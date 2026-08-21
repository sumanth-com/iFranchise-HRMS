"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { EMPLOYEE_ROUTES, PROFILE_IMAGE_MAX_BYTES } from "@/lib/employees/constants";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import {
  removeProfileImage,
  uploadProfileImage,
} from "@/lib/employees/services/employee-mutations";
import type { EmployeeActionResult } from "@/types/employee";

async function getAuthenticatedSupabase() {
  return createClient();
}

function revalidateSelfProfilePaths() {
  revalidatePath("/employee/profile");
  revalidatePath("/manager/profile");
  revalidatePath("/dashboard/profile");
  revalidatePath("/ceo/profile");
}

export async function uploadProfileImageAction(
  employeeId: string,
  formData: FormData,
): Promise<EmployeeActionResult<string>> {
  try {
    const profile = await requireAuthenticatedProfile();
    const isSelf = profile.employee.id === employeeId;
    const canEditOthers = hasPermission(
      profile.permissionCodes,
      "employee_profile.edit",
    );

    if (!isSelf && !canEditOthers) {
      return {
        success: false,
        message: "You do not have permission to update this profile photo",
      };
    }

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

    const supabase = await getAuthenticatedSupabase();
    const storagePath = await uploadProfileImage(
      supabase,
      profile.employee.organizationId,
      employeeId,
      file,
    );

    const { error } = await supabase
      .schema("hrms")
      .from("employee_profiles")
      .update({
        profile_image_storage_path: storagePath,
        updated_by: profile.userId,
      })
      .eq("employee_id", employeeId)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }

    const employee = await getEmployeeById(supabase, employeeId);

    if (employee) {
      revalidatePath(EMPLOYEE_ROUTES.detail(employee));
    }

    revalidatePath("/manager/attendance");
    revalidatePath("/manager/profile");
    revalidatePath("/employee/attendance");
    revalidatePath("/dashboard/attendance");
    revalidateSelfProfilePaths();

    return { success: true, data: storagePath };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to upload profile image",
    };
  }
}

export async function removeProfileImageAction(
  employeeId: string,
): Promise<EmployeeActionResult<null>> {
  try {
    const profile = await requireAuthenticatedProfile();
    const isSelf = profile.employee.id === employeeId;
    const canEditOthers = hasPermission(
      profile.permissionCodes,
      "employee_profile.edit",
    );

    if (!isSelf && !canEditOthers) {
      return {
        success: false,
        message: "You do not have permission to remove this profile photo",
      };
    }

    const supabase = await getAuthenticatedSupabase();
    const employee = await getEmployeeById(supabase, employeeId);

    if (!employee) {
      return { success: false, message: "Employee not found" };
    }

    const storagePath = employee.profile?.profileImageStoragePath;

    if (storagePath) {
      await removeProfileImage(supabase, storagePath);
    }

    const { error } = await supabase
      .schema("hrms")
      .from("employee_profiles")
      .update({
        profile_image_storage_path: null,
        updated_by: profile.userId,
      })
      .eq("employee_id", employeeId)
      .is("deleted_at", null);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath(EMPLOYEE_ROUTES.detail(employee));
    revalidatePath("/manager/attendance");
    revalidatePath("/manager/profile");
    revalidatePath("/employee/attendance");
    revalidatePath("/dashboard/attendance");
    revalidateSelfProfilePaths();

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove profile image",
    };
  }
}
