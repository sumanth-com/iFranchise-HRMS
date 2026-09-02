"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { assertOrganizationStoragePath } from "@/lib/security/storage-path";
import { EMPLOYEE_ROUTES, EMPLOYEE_STORAGE_BUCKETS, PROFILE_IMAGE_MAX_BYTES } from "@/lib/employees/constants";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import {
  removeProfileImage,
  uploadProfileImage,
} from "@/lib/employees/services/employee-mutations";
import { createSignedStorageUrlIfExists } from "@/lib/storage/signed-url";
import type { EmployeeActionResult } from "@/types/employee";

async function getAuthenticatedSupabase() {
  return createClient();
}

function canManageEmployeeProfileImage(permissionCodes: string[]) {
  return hasPermission(permissionCodes, "employee.edit");
}

function revalidateProfileImageSurfaces() {
  revalidatePath(EMPLOYEE_ROUTES.list);
  revalidatePath("/dashboard/system/employees");
  revalidatePath("/dashboard/directory");
  revalidatePath("/employee/profile");
  revalidatePath("/manager/profile");
  revalidatePath("/dashboard/profile");
  revalidatePath("/ceo/profile");
  revalidatePath("/ceo/employees");
  revalidatePath("/ceo/directory");
  revalidatePath("/employee");
  revalidatePath("/manager");
  revalidatePath("/ceo");
}

/** Signed URL for the signed-in user's profile photo (header avatar). */
export async function getMyProfileImageUrlAction(): Promise<
  EmployeeActionResult<string | null>
> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await getAuthenticatedSupabase();
    const { data, error } = await supabase
      .schema("hrms")
      .from("employee_profiles")
      .select("profile_image_storage_path")
      .eq("employee_id", profile.employee.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const path = data?.profile_image_storage_path?.trim() || null;
    if (!path) {
      return { success: true, data: null };
    }

    try {
      assertOrganizationStoragePath(path, profile.employee.organizationId);
    } catch {
      return { success: true, data: null };
    }

    const signedUrl = await createSignedStorageUrlIfExists(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      path,
    );

    return { success: true, data: signedUrl };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load profile photo",
    };
  }
}

/** Signed URL for an employee profile photo when the storage object exists. */
export async function getProfileImageSignedUrlAction(
  employeeId: string,
  storagePath: string,
): Promise<EmployeeActionResult<string | null>> {
  try {
    const profile = await requireAuthenticatedProfile();
    const isSelf = profile.employee.id === employeeId;
    const canViewOthers = hasPermission(profile.permissionCodes, "employee.view");

    if (!isSelf && !canViewOthers) {
      return {
        success: false,
        message: "You do not have permission to view this profile photo",
      };
    }

    const path = storagePath.trim();
    if (!path) {
      return { success: true, data: null };
    }

    assertOrganizationStoragePath(path, profile.employee.organizationId);

    const supabase = await getAuthenticatedSupabase();
    if (!isSelf) {
      const target = await getEmployeeById(supabase, employeeId);
      if (!target || target.organizationId !== profile.employee.organizationId) {
        return { success: false, message: "Employee not found" };
      }
    }

    const signedUrl = await createSignedStorageUrlIfExists(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      path,
    );

    return { success: true, data: signedUrl };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load profile photo",
    };
  }
}

export async function uploadProfileImageAction(
  employeeId: string,
  formData: FormData,
): Promise<EmployeeActionResult<string>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canManageEmployeeProfileImage(profile.permissionCodes)) {
      return {
        success: false,
        message: "Only HR can update employee profile photos",
      };
    }

    const supabase = await getAuthenticatedSupabase();
    const target = await getEmployeeById(supabase, employeeId);
    if (!target || target.organizationId !== profile.employee.organizationId) {
      return { success: false, message: "Employee not found" };
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
      revalidatePath(EMPLOYEE_ROUTES.edit(employee));
    }

    revalidatePath("/manager/attendance");
    revalidatePath("/employee/attendance");
    revalidatePath("/dashboard/attendance");
    revalidateProfileImageSurfaces();

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
    if (!canManageEmployeeProfileImage(profile.permissionCodes)) {
      return {
        success: false,
        message: "Only HR can remove employee profile photos",
      };
    }

    const supabase = await getAuthenticatedSupabase();
    const employee = await getEmployeeById(supabase, employeeId);

    if (!employee || employee.organizationId !== profile.employee.organizationId) {
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
    revalidatePath(EMPLOYEE_ROUTES.edit(employee));
    revalidatePath("/manager/attendance");
    revalidatePath("/employee/attendance");
    revalidatePath("/dashboard/attendance");
    revalidateProfileImageSurfaces();

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove profile image",
    };
  }
}
