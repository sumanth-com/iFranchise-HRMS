"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/permissions/server";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import {
  getEmployeeById,
  getEmployeeAttendance,
  getEmployeeAttendanceSummary,
  getEmployeeBankAccounts,
  getEmployeeLeaveBalances,
  getEmployeeLeaveRequests,
  getEmployeeLeaveApprovals,
  getEmployeePayrollItems,
  getEmployeeSalaryStructure,
  getEmployeeTimeline,
} from "@/lib/employees/services/employee-detail";
import { listEmployeeAssets } from "@/lib/assets/services/asset-queries";
import { resolveEmployeeFromRouteRef } from "@/lib/employees/services/employee-route-resolver";
import {
  createEmployeeFromWizard,
  createSignedStorageUrl,
  ensureDefaultDocumentTypes,
  softDeleteEmployee,
  updateEmployee,
  uploadEmployeeDocument,
  uploadProfileImage,
  removeProfileImage,
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
  EmployeeRouteIdentity,
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
): Promise<EmployeeActionResult<EmployeeRouteIdentity>> {
  try {
    const profile = await requireServerPermission("employee.create");
    const parsed = employeeWizardSchema.parse(payload);
    const supabase = await getAuthenticatedSupabase();
    const employeeId = await createEmployeeFromWizard(
      supabase,
      profile,
      parsed,
    );

    const employee = await getEmployeeById(supabase, employeeId);

    if (!employee) {
      throw new Error("Employee was created but could not be loaded");
    }

    revalidatePath(EMPLOYEE_ROUTES.list);

    return {
      success: true,
      data: {
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
    };
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

    const employee = await getEmployeeById(supabase, employeeId);

    revalidatePath(EMPLOYEE_ROUTES.list);

    if (employee) {
      revalidatePath(EMPLOYEE_ROUTES.detail(employee));
      revalidatePath(EMPLOYEE_ROUTES.edit(employee));
    }

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

export async function getEmployeeDetailBundleAction(employeeRef: string) {
  const profile = await requireServerPermission("employee.view");
  const supabase = await getAuthenticatedSupabase();

  const resolved = await resolveEmployeeFromRouteRef(
    supabase,
    profile.employee.organizationId,
    employeeRef,
  );

  if (!resolved) {
    return null;
  }

  const [
    employeeResult,
    attendanceResult,
    leaveResult,
    leaveApprovalsResult,
    payrollResult,
    bankAccountsResult,
    leaveBalancesResult,
    salaryStructureResult,
    attendanceSummaryResult,
    timelineResult,
    assetsResult,
  ] = await Promise.allSettled([
    getEmployeeById(supabase, resolved.id),
    getEmployeeAttendance(supabase, resolved.id),
    getEmployeeLeaveRequests(supabase, resolved.id),
    getEmployeeLeaveApprovals(supabase, resolved.id),
    getEmployeePayrollItems(supabase, resolved.id),
    getEmployeeBankAccounts(supabase, resolved.id),
    getEmployeeLeaveBalances(supabase, resolved.id),
    getEmployeeSalaryStructure(supabase, resolved.id),
    getEmployeeAttendanceSummary(supabase, resolved.id),
    getEmployeeTimeline(supabase, resolved.id),
    listEmployeeAssets(supabase, profile.employee.organizationId, resolved.id),
  ]);

  const employee =
    employeeResult.status === "fulfilled" ? employeeResult.value : null;

  if (!employee) {
    return null;
  }

  const attendance =
    attendanceResult.status === "fulfilled" ? attendanceResult.value : [];
  const leaveRequests =
    leaveResult.status === "fulfilled" ? leaveResult.value : [];
  const leaveApprovals =
    leaveApprovalsResult.status === "fulfilled"
      ? leaveApprovalsResult.value
      : [];
  const payrollItems =
    payrollResult.status === "fulfilled" ? payrollResult.value : [];
  const bankAccounts =
    bankAccountsResult.status === "fulfilled" ? bankAccountsResult.value : [];
  const leaveBalances =
    leaveBalancesResult.status === "fulfilled" ? leaveBalancesResult.value : [];
  const salaryStructure =
    salaryStructureResult.status === "fulfilled"
      ? salaryStructureResult.value
      : null;
  const attendanceSummary =
    attendanceSummaryResult.status === "fulfilled"
      ? attendanceSummaryResult.value
      : { totalRecords: 0, presentDays: 0, totalWorkHours: 0 };
  const timeline =
    timelineResult.status === "fulfilled" ? timelineResult.value : [];
  const assets = assetsResult.status === "fulfilled" ? assetsResult.value : [];

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
    leaveApprovals,
    payrollItems,
    bankAccounts,
    leaveBalances,
    salaryStructure,
    attendanceSummary,
    timeline,
    assets,
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

    const employee = await getEmployeeById(supabase, employeeId);

    if (employee) {
      revalidatePath(EMPLOYEE_ROUTES.detail(employee));
    }

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
    const profile = await requireServerPermission("employee_profile.edit");
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

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to remove profile image",
    };
  }
}
