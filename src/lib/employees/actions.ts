"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/permissions/server";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import {
  getEmployeeById,
  getEmployeeAttendance,
  getEmployeeLeaveRequests,
  getEmployeePayrollItems,
} from "@/lib/employees/services/employee-detail";
import {
  createEmployeeFromWizard,
  createSignedStorageUrl,
  ensureDefaultDocumentTypes,
  softDeleteEmployee,
  updateEmployee,
  uploadEmployeeDocument,
  uploadProfileImage,
} from "@/lib/employees/services/employee-mutations";
import {
  getEmployeeLookups,
  listEmployees,
  suggestNextEmployeeCode,
} from "@/lib/employees/services/employee-queries";
import {
  employeeListParamsSchema,
  employeeUpdateSchema,
  employeeWizardSchema,
} from "@/lib/validations/employee";
import type {
  EmployeeActionResult,
  EmployeeListParams,
  EmployeeListResult,
} from "@/types/employee";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";

async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  return supabase;
}

export async function fetchEmployeesAction(
  params: EmployeeListParams,
): Promise<EmployeeActionResult<EmployeeListResult>> {
  try {
    const profile = await requireServerPermission("employee.view");
    const supabase = await getAuthenticatedSupabase();
    const parsed = employeeListParamsSchema.parse(params);
    const data = await listEmployees(supabase, profile, parsed);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load employees",
    };
  }
}

export async function getEmployeeCodeSuggestionAction(): Promise<
  EmployeeActionResult<string>
> {
  try {
    const profile = await requireServerPermission("employee.create");
    const supabase = await getAuthenticatedSupabase();
    const code = await suggestNextEmployeeCode(
      supabase,
      profile.employee.organizationId,
    );
    return { success: true, data: code };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to suggest employee code",
    };
  }
}

export async function getEmployeeLookupsAction(excludeEmployeeId?: string) {
  const profile = await requireServerPermission("employee.view");
  const supabase = await getAuthenticatedSupabase();
  await ensureDefaultDocumentTypes(supabase, profile);
  return getEmployeeLookups(
    supabase,
    profile.employee.organizationId,
    excludeEmployeeId,
  );
}

export async function createEmployeeAction(
  payload: unknown,
): Promise<EmployeeActionResult<{ employeeId: string }>> {
  try {
    const profile = await requireServerPermission("employee.create");
    const parsed = employeeWizardSchema.parse(payload);
    const supabase = await getAuthenticatedSupabase();
    const employeeId = await createEmployeeFromWizard(
      supabase,
      profile,
      parsed,
    );

    revalidatePath(EMPLOYEE_ROUTES.list);

    return { success: true, data: { employeeId } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create employee",
    };
  }
}

export async function updateEmployeeAction(
  employeeId: string,
  payload: unknown,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee.edit");
    const parsed = employeeUpdateSchema.parse(payload);
    const supabase = await getAuthenticatedSupabase();
    await updateEmployee(supabase, profile, employeeId, parsed);

    revalidatePath(EMPLOYEE_ROUTES.list);
    revalidatePath(EMPLOYEE_ROUTES.detail(employeeId));

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update employee",
    };
  }
}

export async function deleteEmployeeAction(
  employeeId: string,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee.delete");
    const supabase = await getAuthenticatedSupabase();
    await softDeleteEmployee(supabase, profile, employeeId);

    revalidatePath(EMPLOYEE_ROUTES.list);

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete employee",
    };
  }
}

export async function uploadEmployeeDocumentAction(
  employeeId: string,
  formData: FormData,
): Promise<
  EmployeeActionResult<{
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
  }>
> {
  try {
    const profile = await requireServerPermission("documents.upload");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { success: false, message: "No file provided" };
    }

    const supabase = await getAuthenticatedSupabase();
    const upload = await uploadEmployeeDocument(
      supabase,
      profile.employee.organizationId,
      employeeId || "draft",
      file,
    );

    return { success: true, data: upload };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload document",
    };
  }
}

export async function uploadWizardDocumentAction(
  formData: FormData,
): Promise<
  EmployeeActionResult<{
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
  }>
> {
  try {
    const profile = await requireServerPermission("employee.create");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { success: false, message: "No file provided" };
    }

    const supabase = await getAuthenticatedSupabase();
    const upload = await uploadEmployeeDocument(
      supabase,
      profile.employee.organizationId,
      "pending",
      file,
    );

    return { success: true, data: upload };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload document",
    };
  }
}

export async function getSignedUrlAction(
  bucket: keyof typeof EMPLOYEE_STORAGE_BUCKETS,
  path: string,
): Promise<EmployeeActionResult<string>> {
  try {
    await requireServerPermission("employee.view");
    const supabase = await getAuthenticatedSupabase();
    const bucketName = EMPLOYEE_STORAGE_BUCKETS[bucket];
    const signedUrl = await createSignedStorageUrl(supabase, bucketName, path);

    if (!signedUrl) {
      return { success: false, message: "Unable to generate file URL" };
    }

    return { success: true, data: signedUrl };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sign URL",
    };
  }
}

export async function getEmployeeDetailBundleAction(employeeId: string) {
  const profile = await requireServerPermission("employee.view");
  const supabase = await getAuthenticatedSupabase();

  const [employee, attendance, leaveRequests, payrollItems] = await Promise.all([
    getEmployeeById(supabase, employeeId),
    getEmployeeAttendance(supabase, employeeId),
    getEmployeeLeaveRequests(supabase, employeeId),
    getEmployeePayrollItems(supabase, employeeId),
  ]);

  if (!employee) {
    return null;
  }

  let profileImageUrl: string | null = null;
  if (employee.profile?.profileImageStoragePath) {
    profileImageUrl = await createSignedStorageUrl(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      employee.profile.profileImageStoragePath,
    );
  }

  return {
    employee,
    attendance,
    leaveRequests,
    payrollItems,
    profileImageUrl,
    permissionCodes: profile.permissionCodes,
  };
}

export async function uploadProfileImageAction(
  employeeId: string,
  formData: FormData,
): Promise<EmployeeActionResult<string>> {
  try {
    const profile = await requireServerPermission("employee_profile.edit");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return { success: false, message: "No file provided" };
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

    revalidatePath(EMPLOYEE_ROUTES.detail(employeeId));

    return { success: true, data: storagePath };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to upload profile image",
    };
  }
}
