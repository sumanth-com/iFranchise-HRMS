"use server";

import { revalidatePath } from "next/cache";

import { toUserFriendlyError } from "@/lib/errors/user-messages";
import { createClient } from "@/lib/supabase/server";
import {
  requireAuthenticatedProfile,
  requireServerPermission,
} from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { canEditSelfProfileContactDetails, canEditSelfReportingManager } from "@/lib/employee/profile-contact";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import {
  getEmployeeById,
  getEmployeeAttendance,
  getEmployeeAttendanceSummary,
  parseEmployeeAttendancePeriod,
  getEmployeeBankAccounts,
  getEmployeeLeaveBalances,
  getEmployeeLeaveRequests,
  getEmployeeLeaveApprovals,
  getEmployeePayrollItems,
  getEmployeeSalaryStructure,
  getEmployeeTimeline,
} from "@/lib/employees/services/employee-detail";
import { listEmployeeAssets } from "@/lib/assets/services/asset-queries";
import {
  EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER,
  getEmployeeDocumentsExplorerForEmployee,
} from "@/lib/employee/services/employee-documents-queries";
import { getEmployeeAssetsDataForEmployee } from "@/lib/employee/services/employee-assets-queries";
import { getEmployeePayrollData } from "@/lib/employee/services/employee-payroll-queries";
import {
  getEmployeeRoleAssignment,
  getRoleLookupOptions,
} from "@/lib/roles/services/role-queries";
import { canAssignUserRole } from "@/lib/roles/constants";
import { resolveEmployeeFromRouteRef } from "@/lib/employees/services/employee-route-resolver";
import {
  createEmployeeFromWizard,
  createSignedStorageUrl,
  ensureDefaultDocumentTypes,
  resolveOrCreateDesignation,
  updateEmployee,
  uploadEmployeeDocument,
} from "@/lib/employees/services/employee-mutations";
import {
  activateEmployeeAccount,
  cancelEmployeeInvitation,
  deactivateEmployeeAccount,
  inviteEmployeeByEmail,
  resendEmployeeInvitation,
  resetEmployeePassword,
  sendEmployeeInvitation,
  suspendEmployeeAccount,
} from "@/lib/employees/services/employee-account";
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
import { z } from "zod";

import { permanentlyDeleteEmployee } from "@/lib/employees/services/employee-permanent-delete";
import { loadInviteableRoles, getInviteableRoleByCode } from "@/lib/auth/iam-roles";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOrganizationStoragePath } from "@/lib/security/storage-path";
import {
  employeeInviteSchema,
  employeeSelfPreferencesSchema,
  employeeSelfProfileSchema,
} from "@/lib/validations/employee";
import {
  getEmployeeSelfProfileSettings,
  updateEmployeeSelfPreferences,
  updateEmployeeSelfProfileWithContact,
} from "@/lib/employee/services/employee-self-profile";
import { initializeEmployeeLeaveBalances } from "@/lib/leave/services/leave-mutations";
import { EMPLOYEE_ROUTES as PORTAL_EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";

async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  return supabase;
}

async function revalidateEmployeeAccountPaths(employeeId: string) {
  const supabase = await getAuthenticatedSupabase();
  const employee = await getEmployeeById(supabase, employeeId);
  revalidatePath(EMPLOYEE_ROUTES.list);
  if (employee) {
    revalidatePath(EMPLOYEE_ROUTES.detail(employee));
    revalidatePath(EMPLOYEE_ROUTES.edit(employee));
  }
}

function revalidateSelfProfilePaths() {
  revalidatePath("/employee/profile");
  revalidatePath("/manager/profile");
  revalidatePath("/dashboard/profile");
  revalidatePath("/ceo/profile");
  revalidatePath("/employee/directory");
  revalidatePath("/manager/directory");
  revalidatePath("/ceo/employees");
  revalidatePath("/ceo/directory");
  revalidatePath(PORTAL_EMPLOYEE_ROUTES.leave);
  revalidatePath(MANAGER_ROUTES.leave);
  revalidatePath("/dashboard/system/leave");
  revalidatePath("/dashboard/leave");
  revalidatePath("/ceo/leave");
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
      message: toUserFriendlyError(error, "Failed to create employee"),
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
    revalidatePath("/dashboard/system/employees");
    revalidatePath("/dashboard/directory");
    revalidateSelfProfilePaths();

    if (employee) {
      revalidatePath(EMPLOYEE_ROUTES.detail(employee));
      revalidatePath(EMPLOYEE_ROUTES.edit(employee));
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to update employee"),
    };
  }
}

export async function deleteEmployeeAction(
  employeeId: string,
): Promise<EmployeeActionResult<{ fullName: string; employeeCode: string }>> {
  try {
    const profile = await requireServerPermission("employee.delete");
    const deleted = await permanentlyDeleteEmployee(profile, employeeId);

    revalidatePath(EMPLOYEE_ROUTES.list);
    revalidatePath("/dashboard/hr-overview");
    revalidatePath("/dashboard/directory");
    revalidatePath("/dashboard/payroll");
    revalidatePath("/employee");
    revalidatePath("/manager");

    return { success: true, data: deleted };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to delete employee",
    };
  }
}

export async function sendEmployeeInvitationAction(
  employeeId: string,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee_account.invite");
    const supabase = await getAuthenticatedSupabase();
    const admin = createAdminClient();
    const { data: employee } = await admin
      .schema("hrms")
      .from("employees")
      .select("invited_role_id")
      .eq("id", employeeId)
      .maybeSingle();
    const roleId =
      (employee?.invited_role_id as string | null) ??
      (await getInviteableRoleByCode(admin, profile.employee.organizationId, "employee")).id;
    await sendEmployeeInvitation(supabase, profile, employeeId, roleId);
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send invitation",
    };
  }
}

export async function getEmployeeInviteLookupsAction() {
  try {
    const profile = await requireServerPermission("employee_account.invite");
    const supabase = await getAuthenticatedSupabase();
    const [lookups, roles] = await Promise.all([
      getEmployeeLookups(supabase, profile.employee.organizationId),
      loadInviteableRoles(supabase, profile.employee.organizationId),
    ]);
    return {
      success: true as const,
      data: {
        ...lookups,
        roles: roles.map((role) => ({
          id: role.id,
          label: `${role.name} · ${role.portalLabel}`,
          code: role.code,
        })),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load invite options",
    };
  }
}

export async function inviteEmployeeAction(
  input: unknown,
): Promise<EmployeeActionResult<{ employeeId: string }>> {
  try {
    const profile = await requireServerPermission("employee_account.invite");
    const parsed = employeeInviteSchema.parse(input);
    const admin = createAdminClient();
    const designationId = await resolveOrCreateDesignation(
      admin as unknown as AuthSupabaseClient,
      profile.employee.organizationId,
      profile.userId,
      parsed.designation,
    );
    const supabase = await getAuthenticatedSupabase();
    const employeeId = await inviteEmployeeByEmail(supabase, profile, parsed.email, {
      fullName: parsed.fullName,
      roleId: parsed.roleId,
      departmentId: parsed.departmentId,
      branchId: parsed.branchId,
      designationId,
      employmentTypeId: parsed.employmentTypeId,
      reportingManagerId: parsed.reportingManagerId,
    });
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: { employeeId } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to invite employee";
    if (message.includes("employees_org_email_active_idx")) {
      return {
        success: false,
        message: "This email is already registered for an employee in your organization.",
      };
    }
    if (message.includes("employees_org_code_active_idx")) {
      return {
        success: false,
        message: "Could not assign a unique employee ID. Please try again.",
      };
    }
    return { success: false, message };
  }
}

/** @deprecated Use inviteEmployeeAction for HR onboarding invites. */
export async function inviteEmployeeByEmailAction(
  input: unknown,
): Promise<EmployeeActionResult<{ employeeId: string }>> {
  try {
    const profile = await requireServerPermission("employee_account.invite");
    const parsed = z.object({ email: z.string().email("Enter a valid email address") }).parse(input);
    const supabase = await getAuthenticatedSupabase();
    const employeeId = await inviteEmployeeByEmail(supabase, profile, parsed.email);
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: { employeeId } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to invite employee";
    if (message.includes("employees_org_email_active_idx")) {
      return {
        success: false,
        message: "This email is already registered for an employee in your organization.",
      };
    }
    if (message.includes("employees_org_code_active_idx")) {
      return {
        success: false,
        message: "Could not assign a unique employee ID. Please try again.",
      };
    }
    return { success: false, message };
  }
}

export async function resendEmployeeInvitationAction(
  employeeId: string,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee_account.invite");
    const supabase = await getAuthenticatedSupabase();
    await resendEmployeeInvitation(supabase, profile, employeeId);
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[resendEmployeeInvitationAction] failed", {
      employeeId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "We couldn't send the invitation right now. Please try again.",
    };
  }
}

export async function cancelEmployeeInvitationAction(
  employeeId: string,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee_account.cancel_invitation");
    const supabase = await getAuthenticatedSupabase();
    await cancelEmployeeInvitation(supabase, profile, employeeId);
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to cancel invitation",
    };
  }
}

export async function resetEmployeePasswordAction(
  employeeId: string,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee_account.reset_password");
    const supabase = await getAuthenticatedSupabase();
    await resetEmployeePassword(supabase, profile, employeeId);
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to reset password",
    };
  }
}

export async function suspendEmployeeAccountAction(
  employeeId: string,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee_account.suspend");
    const supabase = await getAuthenticatedSupabase();
    await suspendEmployeeAccount(supabase, profile, employeeId);
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to suspend account",
    };
  }
}

export async function deactivateEmployeeAccountAction(
  employeeId: string,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee_account.deactivate");
    const supabase = await getAuthenticatedSupabase();
    await deactivateEmployeeAccount(supabase, profile, employeeId);
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to deactivate account",
    };
  }
}

export async function activateEmployeeAccountAction(
  employeeId: string,
): Promise<EmployeeActionResult> {
  try {
    const profile = await requireServerPermission("employee_account.activate");
    const supabase = await getAuthenticatedSupabase();
    await activateEmployeeAccount(supabase, profile, employeeId);
    await revalidateEmployeeAccountPaths(employeeId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to activate account",
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
    const profile = await requireServerPermission("employee.view");
    assertOrganizationStoragePath(path, profile.employee.organizationId);
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

export async function getEmployeeDetailBundleAction(
  employeeRef: string,
  searchParams?: Record<string, string | string[] | undefined>,
) {
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

  const attendancePeriod = parseEmployeeAttendancePeriod(searchParams ?? {});

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
    documentsExplorerResult,
    assetsDataResult,
    payrollDataResult,
  ] = await Promise.allSettled([
    getEmployeeById(supabase, resolved.id),
    getEmployeeAttendance(supabase, resolved.id, attendancePeriod),
    getEmployeeLeaveRequests(supabase, resolved.id, attendancePeriod),
    getEmployeeLeaveApprovals(supabase, resolved.id, attendancePeriod),
    getEmployeePayrollItems(supabase, resolved.id),
    getEmployeeBankAccounts(supabase, resolved.id),
    getEmployeeLeaveBalances(supabase, resolved.id, attendancePeriod),
    getEmployeeSalaryStructure(supabase, resolved.id),
    getEmployeeAttendanceSummary(supabase, resolved.id, attendancePeriod),
    getEmployeeTimeline(supabase, resolved.id),
    listEmployeeAssets(supabase, profile.employee.organizationId, resolved.id),
    getEmployeeDocumentsExplorerForEmployee(
      supabase,
      profile.employee.organizationId,
      resolved.id,
    ),
    getEmployeeAssetsDataForEmployee(
      supabase,
      profile.employee.organizationId,
      resolved.id,
      profile,
    ),
    getEmployeePayrollData(supabase, profile, { targetEmployeeId: resolved.id }),
  ]);

  const employee =
    employeeResult.status === "fulfilled" ? employeeResult.value : null;

  if (!employee) {
    if (employeeResult.status === "rejected") {
      console.error("[employee-detail] failed to load employee record", {
        employeeId: resolved.id,
        employeeRef,
        reason: employeeResult.reason,
      });
      throw employeeResult.reason;
    }
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
      : { totalRecords: 0, presentDays: 0, absentDays: 0, lateDays: 0, halfDayDays: 0, totalWorkHours: 0 };
  const timeline =
    timelineResult.status === "fulfilled" ? timelineResult.value : [];
  const assets = assetsResult.status === "fulfilled" ? assetsResult.value : [];
  const documentsExplorer =
    documentsExplorerResult.status === "fulfilled"
      ? documentsExplorerResult.value
      : EMPTY_EMPLOYEE_DOCUMENTS_EXPLORER;
  const assetsData =
    assetsDataResult.status === "fulfilled"
      ? assetsDataResult.value
      : {
          assigned: [],
          history: [],
          requests: [],
          summary: {
            currentlyAssigned: 0,
            previouslyReturned: 0,
            underRepair: 0,
            warrantyExpiringSoon: 0,
            lostOrDamaged: 0,
          },
          categories: [],
        };
  const payrollData =
    payrollDataResult.status === "fulfilled" ? payrollDataResult.value : null;

  const canChangeRole = canAssignUserRole(profile.permissionCodes);
  const [roleAssignment, assignableRoles, lookups] = await Promise.all([
    canChangeRole
      ? getEmployeeRoleAssignment(supabase, profile.employee.organizationId, resolved.id)
      : Promise.resolve(null),
    canChangeRole
      ? getRoleLookupOptions(supabase, profile.employee.organizationId)
      : Promise.resolve([]),
    getEmployeeLookups(supabase, profile.employee.organizationId, resolved.id),
  ]);

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
    attendancePeriod,
    timeline,
    assets,
    documentsExplorer,
    assetsData,
    payrollData,
    profileImageUrl,
    permissionCodes: profile.permissionCodes,
    roleAssignment,
    assignableRoles,
    lookups,
  };
}

export async function updateEmployeeSelfProfileAction(
  input: unknown,
): Promise<EmployeeActionResult<null>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!profile.employee?.id) {
      return { success: false, message: "Employee profile not found" };
    }

    const canEditContact = canEditSelfProfileContactDetails(profile.permissionCodes);
    const canEditReportingManager = canEditSelfReportingManager(profile.permissionCodes);

    const supabase = await getAuthenticatedSupabase();

    if (canEditContact) {
      const parsed = employeeSelfProfileSchema.parse(input);
      const existing = await getEmployeeSelfProfileSettings(supabase, profile);

      if (!existing) {
        return { success: false, message: "Employee profile not found" };
      }

      await updateEmployeeSelfProfileWithContact(supabase, profile, parsed, existing, {
        allowReportingManagerUpdate: canEditReportingManager,
      });
      await initializeEmployeeLeaveBalances(supabase, profile, profile.employee.id);
    } else {
      const parsed = employeeSelfPreferencesSchema.parse(input);
      await updateEmployeeSelfPreferences(supabase, profile, parsed);
    }

    const { data: profileRow, error: profileRowError } = await supabase
      .schema("hrms")
      .from("employee_profiles")
      .select("self_profile_submitted_at")
      .eq("employee_id", profile.employee.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (profileRowError) {
      throw new Error(profileRowError.message);
    }

    const submittedAt = profileRow?.self_profile_submitted_at ?? new Date().toISOString();

    const { error: submitError } = await supabase
      .schema("hrms")
      .from("employee_profiles")
      .update({
        self_profile_submitted_at: submittedAt,
        updated_by: profile.userId,
      })
      .eq("employee_id", profile.employee.id)
      .is("deleted_at", null);

    if (submitError) {
      throw new Error(submitError.message);
    }

    revalidateSelfProfilePaths();
    revalidatePath(
      EMPLOYEE_ROUTES.detail({
        employeeCode: profile.employee.employeeCode,
        firstName: profile.employee.firstName,
        lastName: profile.employee.lastName,
      }),
    );

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to update profile"),
    };
  }
}

export async function getEmployeePeriodDataAction(
  employeeId: string,
  month: number,
  year: number,
) {
  await requireServerPermission("employee.view");
  const supabase = await getAuthenticatedSupabase();

  const period = { month, year };

  const [attendance, leaveRequests, leaveApprovals, leaveBalances, attendanceSummary] =
    await Promise.all([
      getEmployeeAttendance(supabase, employeeId, period),
      getEmployeeLeaveRequests(supabase, employeeId, period),
      getEmployeeLeaveApprovals(supabase, employeeId, period),
      getEmployeeLeaveBalances(supabase, employeeId, period),
      getEmployeeAttendanceSummary(supabase, employeeId, period),
    ]);

  return { attendance, leaveRequests, leaveApprovals, leaveBalances, attendanceSummary };
}
