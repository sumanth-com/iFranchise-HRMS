"use server";

import { revalidatePath } from "next/cache";

import { siteConfig } from "@/config/site";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { ceoOrViewPermission } from "@/lib/ceo/read-only-permissions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toUserFriendlyError } from "@/lib/errors/user-messages";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import {
  getPayrollRunById,
  getPayslipById,
} from "@/lib/payroll/services/payroll-detail";
import {
  approveBonus,
  approvePayrollStep,
  approveReimbursement,
  cancelPendingReimbursement,
  createBonus,
  createReimbursement,
  createSalaryRevision,
  createSalaryStructure,
  deleteReimbursement,
  deleteSalaryStructure,
  updateSalaryStructure,
  emailPayslip,
  generatePayrollRun,
  ensureCompanyPayrollRun,
  getEmployeeRunBreakdown,
  markPayrollPaid,
  previewPayrollRun,
  processPayrollRun,
  rejectPayrollRun,
  rejectReimbursement,
  releaseEmployeePayslip,
  ensureUnpublishedPayslipForPayrollItem,
  syncActiveEmployeesIntoPayrollRun,
  updatePendingReimbursement,
  updatePayrollItemAdjustments,
} from "@/lib/payroll/services/payroll-mutations";
import { PayslipEmailError } from "@/lib/payroll/services/payslip-email-errors";
import {
  getPayrollSettings,
  savePayrollSettings,
} from "@/lib/payroll/services/payroll-settings";
import {
  getPayrollLookups,
  getPayrollSummary,
  listBonuses,
  listPayrollRuns,
  listPayslips,
  listReimbursements,
  listSalaryRevisions,
  listSalaryStructures,
  getSalaryStructureById,
} from "@/lib/payroll/services/payroll-queries";
import { listEmployeeAccounts } from "@/lib/payroll/services/employee-accounts-queries";
import { upsertEmployeeAccount } from "@/lib/payroll/services/employee-accounts-mutations";
import {
  bonusFormSchema,
  bonusListParamsSchema,
  employeePayrollBreakdownSchema,
  employeeReimbursementClaimSchema,
  payrollApprovalSchema,
  payrollItemAdjustmentSchema,
  payrollListParamsSchema,
  payrollRejectSchema,
  payrollRunSchema,
  reimbursementDecisionSchema,
  reimbursementFormSchema,
  reimbursementListParamsSchema,
  reimbursementUpdatePendingSchema,
  salaryRevisionFormSchema,
  salaryRevisionListParamsSchema,
  salaryStructureFormSchema,
  salaryStructureListParamsSchema,
  employeeAccountFormSchema,
  employeeAccountListParamsSchema,
  sendEmployeePayslipSchema,
} from "@/lib/validations/payroll";
import {
  REIMBURSEMENT_STORAGE_BUCKET,
  payrollTeamSectionPath,
  PAYROLL_ROUTES,
  SELF_PAYROLL_ROUTES,
  TEAM_PAYROLL_SECTIONS,
  validateReimbursementAttachmentFile,
} from "@/lib/payroll/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { SYSTEM_ADMIN_PERMISSION, SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";
import { assertOrganizationStoragePath } from "@/lib/security/storage-path";

function revalidateReimbursementViews() {
  revalidatePath(EMPLOYEE_ROUTES.reimbursements);
  revalidatePath(HR_HUB_ROUTES.myReimbursements);
  revalidatePath(MANAGER_ROUTES.reimbursements);
  revalidatePath(SYSTEM_ADMIN_ROUTES.reimbursements);
  revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.reimbursements));
  revalidatePath(`${CEO_ROUTES.payroll}/${TEAM_PAYROLL_SECTIONS.reimbursements}`);
  revalidatePath(PAYROLL_ROUTES.reimbursements);
  // Team Payroll Reimb. column / payslips must refresh after approve/delete.
  revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.run));
  revalidatePath(`${CEO_ROUTES.payroll}/${TEAM_PAYROLL_SECTIONS.run}`);
  revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.payslips));
  revalidatePath(`${CEO_ROUTES.payroll}/${TEAM_PAYROLL_SECTIONS.payslips}`);
  revalidatePath(PAYROLL_ROUTES.run);
  revalidatePath(PAYROLL_ROUTES.payslips);
}
import { payrollSettingsSchema } from "@/lib/validations/payroll-settings";
import type {
  BonusListResult,
  EmployeePayrollRunBreakdown,
  PayrollActionResult,
  PayrollDetail,
  PayrollListParams,
  PayrollListResult,
  PayrollLookups,
  PayrollPreviewResult,
  PayrollSummary,
  PayslipDetail,
  PayslipListResult,
  ReimbursementListResult,
  SalaryRevisionListResult,
  SalaryStructureItem,
  SalaryStructureListResult,
} from "@/types/payroll";
import type { EmployeeAccountListResult } from "@/types/employee-accounts";
import type { PayrollSettingsRecord } from "@/types/payroll-settings";

async function getAuthenticatedSupabase() {
  return createClient();
}

function revalidateEmployeeAccountViews() {
  revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS["employee-accounts"]));
  revalidatePath("/dashboard/employees");
  revalidatePath("/employee/payroll");
}

function revalidateEmployeePayrollViews() {
  revalidatePath(SELF_PAYROLL_ROUTES.list);
  revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.bonuses));
  revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.reimbursements));
  revalidatePath("/employee/payroll");
  revalidatePath("/manager/payroll");
  revalidatePath("/dashboard/system/payroll");
}

function revalidatePayrollPaths() {
  revalidatePath(PAYROLL_ROUTES.dashboard);
  revalidatePath(PAYROLL_ROUTES.history);
  revalidatePath(PAYROLL_ROUTES.run);
  revalidatePath(PAYROLL_ROUTES.payslips);
  revalidatePath(SELF_PAYROLL_ROUTES.list);
  revalidatePath(CEO_ROUTES.payroll);
}

export async function previewPayrollRunAction(
  input: unknown,
): Promise<PayrollActionResult<PayrollPreviewResult>> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.run",
      "payroll.process",
      "payroll.generate",
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollRunSchema.parse(input);
    const data = await previewPayrollRun(supabase, profile, parsed);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to preview payroll"),
    };
  }
}

export async function fetchEmployeePayrollBreakdownAction(
  input: unknown,
): Promise<PayrollActionResult<EmployeePayrollRunBreakdown>> {
  try {
    const profile = await requireServerAnyPermission([
      ...ceoOrViewPermission("payroll.view"),
      "payroll.run",
      "payroll.process",
      "payroll.generate",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = employeePayrollBreakdownSchema.parse(input);
    const data = await getEmployeeRunBreakdown(supabase, profile, parsed);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        toUserFriendlyError(error, "Failed to load employee payroll breakdown"),
    };
  }
}

export async function ensureCompanyPayrollRunAction(
  input: unknown,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.run",
      "payroll.process",
      "payroll.generate",
      "payroll.create",
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollRunSchema.parse(input);
    const id = await ensureCompanyPayrollRun(supabase, profile, parsed);
    revalidatePayrollPaths();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to calculate payroll"),
    };
  }
}

export async function generatePayrollRunAction(
  input: unknown,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.run",
      "payroll.process",
      "payroll.generate",
      "payroll.create",
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollRunSchema.parse(input);
    const id = await generatePayrollRun(supabase, profile, parsed);
    revalidatePayrollPaths();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to generate payroll"),
    };
  }
}

export async function updatePayrollItemAdjustmentsAction(
  input: unknown,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.run",
      "payroll.process",
      "payroll.edit",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollItemAdjustmentSchema.parse(input);
    await updatePayrollItemAdjustments(supabase, profile, parsed);
    revalidatePayrollPaths();
    revalidateEmployeePayrollViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to save payroll changes"),
    };
  }
}

export async function ensurePayrollItemPayslipAction(
  payrollItemId: string,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.run",
      "payroll.process",
      "payslip.generate",
      "payroll.view",
      "payslip.view",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = sendEmployeePayslipSchema.parse({ payrollItemId });
    const payslipId = await ensureUnpublishedPayslipForPayrollItem(
      supabase,
      profile,
      parsed.payrollItemId,
    );
    return { success: true, data: payslipId };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to open payslip"),
    };
  }
}

export async function releaseEmployeePayslipAction(
  payrollItemId: string,
): Promise<PayrollActionResult<{ emailed: boolean }>> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.run",
      "payroll.process",
      "payslip.generate",
      "payroll.download",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = sendEmployeePayslipSchema.parse({ payrollItemId });
    const data = await releaseEmployeePayslip(
      supabase,
      profile,
      parsed.payrollItemId,
      siteConfig.url,
    );
    revalidatePayrollPaths();
    revalidateEmployeePayrollViews();
    revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.payslips));
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to send payslip"),
    };
  }
}

export async function processPayrollRunAction(
  payrollId: string,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.run",
      "payroll.process",
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await getAuthenticatedSupabase();
    await processPayrollRun(supabase, profile, payrollId);
    revalidatePayrollPaths();
    revalidatePath(PAYROLL_ROUTES.detail(payrollId));
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to process payroll"),
    };
  }
}

export async function approvePayrollStepAction(
  input: unknown,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerPermission("payroll.approve");
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollApprovalSchema.parse(input);
    await approvePayrollStep(
      supabase,
      profile,
      parsed.payrollId,
      parsed.comments,
    );
    revalidatePayrollPaths();
    revalidatePath(PAYROLL_ROUTES.detail(parsed.payrollId));
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to approve payroll"),
    };
  }
}

export async function rejectPayrollRunAction(
  input: unknown,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerPermission("payroll.approve");
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollRejectSchema.parse(input);
    await rejectPayrollRun(
      supabase,
      profile,
      parsed.payrollId,
      parsed.comments,
    );
    revalidatePayrollPaths();
    revalidatePath(PAYROLL_ROUTES.detail(parsed.payrollId));
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to reject payroll"),
    };
  }
}

export async function markPayrollPaidAction(
  payrollId: string,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission(["payroll.pay", "payroll.approve"]);
    const supabase = await getAuthenticatedSupabase();
    await markPayrollPaid(supabase, profile, payrollId);
    revalidatePayrollPaths();
    revalidatePath(PAYROLL_ROUTES.detail(payrollId));
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to mark payroll as paid"),
    };
  }
}

export async function createSalaryStructureAction(
  input: unknown,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "salary.edit",
      "salary_structure.edit",
      "salary_structure.create",
    ]);
    const supabase = await getAuthenticatedSupabase();
    salaryStructureFormSchema.parse(input);
    const id = await createSalaryStructure(supabase, profile, input);
    revalidatePath(PAYROLL_ROUTES.salaryStructures);
    revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS["salary-structures"]));
    revalidatePath(PAYROLL_ROUTES.run);
    revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.run));
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to create salary structure"),
    };
  }
}

export async function updateSalaryStructureAction(
  structureId: string,
  input: unknown,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "salary.edit",
      "salary_structure.edit",
      "salary_structure.create",
    ]);
    const supabase = await getAuthenticatedSupabase();
    salaryStructureFormSchema.parse(input);
    await updateSalaryStructure(supabase, profile, structureId, input);
    revalidatePath(PAYROLL_ROUTES.salaryStructures);
    revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS["salary-structures"]));
    revalidatePath(PAYROLL_ROUTES.run);
    revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.run));
    return { success: true, data: structureId };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to update salary structure"),
    };
  }
}

export async function deleteSalaryStructureAction(
  structureId: string,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "salary.edit",
      "salary_structure.edit",
      "salary_structure.create",
      "salary_structure.delete",
    ]);
    const supabase = await getAuthenticatedSupabase();
    await deleteSalaryStructure(supabase, profile, structureId);
    revalidatePath(PAYROLL_ROUTES.salaryStructures);
    revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS["salary-structures"]));
    revalidatePath(PAYROLL_ROUTES.run);
    revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.run));
    return { success: true, data: structureId };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to delete salary structure"),
    };
  }
}

export async function fetchSalaryStructureAction(
  structureId: string,
): Promise<SalaryStructureItem | null> {
  const profile = await requireServerAnyPermission([
    "salary.view",
    "salary_structure.view",
  ]);
  const supabase = await getAuthenticatedSupabase();
  return getSalaryStructureById(supabase, profile, structureId);
}

export async function createSalaryRevisionAction(
  input: unknown,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "salary.edit",
      "salary_structure.edit",
    ]);
    const supabase = await getAuthenticatedSupabase();
    salaryRevisionFormSchema.parse(input);
    const id = await createSalaryRevision(supabase, profile, input);
    revalidatePath(PAYROLL_ROUTES.revisions);
    revalidatePath(PAYROLL_ROUTES.salaryStructures);
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to create salary revision"),
    };
  }
}

export async function createBonusAction(
  input: unknown,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "bonus.create",
      "payroll.create",
      "payroll.generate",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = bonusFormSchema.parse(input);
    const id = await createBonus(supabase, profile, parsed);
    revalidatePath(PAYROLL_ROUTES.bonuses);
    revalidateEmployeePayrollViews();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to create bonus"),
    };
  }
}

export async function approveBonusAction(bonusId: string): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "bonus.approve",
      "payroll.approve",
    ]);
    const supabase = await getAuthenticatedSupabase();
    await approveBonus(supabase, profile, bonusId);
    revalidatePath(PAYROLL_ROUTES.bonuses);
    revalidateEmployeePayrollViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to approve bonus"),
    };
  }
}

export async function createReimbursementAction(
  input: unknown,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.create",
      "payroll.create",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = reimbursementFormSchema.parse(input);
    const id = await createReimbursement(supabase, profile, {
      ...parsed,
      receiptPaths: parsed.receiptPaths ?? [],
    });
    revalidateReimbursementViews();
    revalidateEmployeePayrollViews();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to create reimbursement"),
    };
  }
}

export async function submitOwnReimbursementClaimAction(
  input: unknown,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.create",
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      PORTAL_PERMISSIONS.hr,
      SYSTEM_ADMIN_PERMISSION,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = employeeReimbursementClaimSchema.parse(input);
    const id = await createReimbursement(supabase, profile, {
      employeeId: profile.employee.id,
      category: parsed.category,
      amount: parsed.amount,
      expenseDate: parsed.expenseDate,
      description: parsed.description,
      receiptPaths: parsed.receiptPaths,
    });
    revalidateReimbursementViews();
    revalidateEmployeePayrollViews();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to submit reimbursement claim"),
    };
  }
}

export async function approveReimbursementAction(
  input: unknown,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.approve",
      "payroll.approve",
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed =
      typeof input === "string"
        ? { reimbursementId: input, remarks: null }
        : reimbursementDecisionSchema.parse(input);
    await approveReimbursement(
      supabase,
      profile,
      parsed.reimbursementId,
      parsed.remarks,
    );
    revalidateReimbursementViews();
    revalidateEmployeePayrollViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to approve reimbursement"),
    };
  }
}

export async function rejectReimbursementAction(
  input: unknown,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.approve",
      "payroll.approve",
      PORTAL_PERMISSIONS.ceo,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = reimbursementDecisionSchema.parse(input);
    await rejectReimbursement(
      supabase,
      profile,
      parsed.reimbursementId,
      parsed.remarks,
    );
    revalidateReimbursementViews();
    revalidateEmployeePayrollViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to reject reimbursement"),
    };
  }
}

export async function deleteReimbursementAction(
  reimbursementId: string,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.approve",
      "payroll.approve",
      PORTAL_PERMISSIONS.ceo,
      PORTAL_PERMISSIONS.hr,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const id = String(reimbursementId ?? "").trim();
    if (!id) throw new Error("Reimbursement id is required.");
    await deleteReimbursement(supabase, profile, id);
    revalidateReimbursementViews();
    revalidateEmployeePayrollViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to delete reimbursement"),
    };
  }
}

export async function updateOwnPendingReimbursementAction(
  input: unknown,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.create",
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      PORTAL_PERMISSIONS.hr,
      SYSTEM_ADMIN_PERMISSION,
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = reimbursementUpdatePendingSchema.parse(input);
    await updatePendingReimbursement(supabase, profile, parsed, {
      employeeId: profile.employee.id,
    });
    revalidateReimbursementViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to update reimbursement"),
    };
  }
}

export async function cancelOwnPendingReimbursementAction(
  reimbursementId: string,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.create",
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      PORTAL_PERMISSIONS.hr,
      SYSTEM_ADMIN_PERMISSION,
    ]);
    const supabase = await getAuthenticatedSupabase();
    await cancelPendingReimbursement(supabase, profile, reimbursementId, {
      employeeId: profile.employee.id,
    });
    revalidateReimbursementViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to cancel reimbursement"),
    };
  }
}

export async function uploadReimbursementAttachmentAction(
  formData: FormData,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.create",
      "payroll.create",
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      PORTAL_PERMISSIONS.hr,
      SYSTEM_ADMIN_PERMISSION,
    ]);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, message: "No file provided" };
    }

    try {
      validateReimbursementAttachmentFile({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    } catch (validationError) {
      return {
        success: false,
        message:
          validationError instanceof Error
            ? validationError.message
            : "Unsupported file. Upload an image or PDF up to 5 MB.",
      };
    }

    // Optional target employee for HR on-behalf uploads (must be same org).
    const targetEmployeeIdRaw = formData.get("employeeId");
    const targetEmployeeId =
      typeof targetEmployeeIdRaw === "string" && targetEmployeeIdRaw.trim()
        ? targetEmployeeIdRaw.trim()
        : profile.employee.id;

    if (targetEmployeeId !== profile.employee.id) {
      const canUploadForOthers =
        profile.permissionCodes.includes("reimbursement.create") ||
        profile.permissionCodes.includes("payroll.create") ||
        profile.permissionCodes.includes(PORTAL_PERMISSIONS.hr) ||
        profile.permissionCodes.includes(SYSTEM_ADMIN_PERMISSION);
      if (!canUploadForOthers) {
        return { success: false, message: "You can only upload receipts for your own claims." };
      }
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${profile.employee.organizationId}/reimbursements/${targetEmployeeId}/${crypto.randomUUID()}-${sanitizedName}`;
    assertOrganizationStoragePath(storagePath, profile.employee.organizationId);

    // Service role after authz — managers/employees without documents.upload still succeed.
    const admin = createAdminClient();
    const { error } = await admin.storage.from(REIMBURSEMENT_STORAGE_BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      const message = error.message || "Failed to upload attachment";
      if (/mime|type|not supported|invalid/i.test(message)) {
        return {
          success: false,
          message: "Unsupported file type. Use PDF, JPG, PNG, WebP, GIF, or HEIC (max 5 MB).",
        };
      }
      throw new Error(message);
    }
    return { success: true, data: storagePath };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to upload attachment"),
    };
  }
}

export async function getReimbursementAttachmentUrlAction(
  path: string,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.view",
      "payroll.view",
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      PORTAL_PERMISSIONS.ceo,
      PORTAL_PERMISSIONS.hr,
      ...ceoOrViewPermission("payroll.view"),
    ]);
    assertOrganizationStoragePath(path, profile.employee.organizationId);
    // Employees may only open attachments under their own folder.
    const isOrgApprover =
      profile.permissionCodes.includes("reimbursement.approve") ||
      profile.permissionCodes.includes("payroll.approve") ||
      profile.permissionCodes.includes(PORTAL_PERMISSIONS.ceo) ||
      profile.permissionCodes.includes(PORTAL_PERMISSIONS.hr) ||
      profile.permissionCodes.includes(SYSTEM_ADMIN_PERMISSION);
    if (!isOrgApprover) {
      const ownPrefix = `${profile.employee.organizationId}/reimbursements/${profile.employee.id}/`;
      if (!path.startsWith(ownPrefix)) {
        return { success: false, message: "You do not have access to this attachment." };
      }
    }

    // Sign with service role after access checks so CEO/HR can open claimant receipts.
    const admin = createAdminClient();
    const url = await createSignedStorageUrl(
      admin,
      REIMBURSEMENT_STORAGE_BUCKET,
      path,
    );
    if (!url) return { success: false, message: "Attachment not found." };
    return { success: true, data: url };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to open attachment"),
    };
  }
}

export async function emailPayslipAction(payslipId: string): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.download",
      "payslip.generate",
      "payslip.view",
    ]);
    const supabase = await getAuthenticatedSupabase();
    await emailPayslip(supabase, profile, payslipId, siteConfig.url);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[payroll] payslip email failed", {
      payslipId,
      name: error instanceof Error ? error.name : "unknown",
      message: toUserFriendlyError(error, "unknown"),
    });
    return {
      success: false,
      message:
        error instanceof PayslipEmailError
          ? error.message
          : "Could not email this payslip right now. Please try again.",
    };
  }
}

export async function fetchPayrollSummaryAction(
  month?: number,
  year?: number,
): Promise<PayrollSummary> {
  const profile = await requireServerAnyPermission(ceoOrViewPermission("payroll.view"));
  const supabase = await getAuthenticatedSupabase();
  return getPayrollSummary(supabase, profile, month, year);
}

export async function fetchPayrollRunsAction(
  params: PayrollListParams,
): Promise<PayrollListResult> {
  try {
    const profile = await requireServerAnyPermission(ceoOrViewPermission("payroll.view"));
    const supabase = await getAuthenticatedSupabase();
    return listPayrollRuns(supabase, profile, payrollListParamsSchema.parse(params));
  } catch (error) {
    throw new Error(toUserFriendlyError(error, "Failed to load payroll runs"));
  }
}

export async function fetchPayrollDetailAction(
  payrollId: string,
): Promise<PayrollDetail | null> {
  try {
    const profile = await requireServerAnyPermission(ceoOrViewPermission("payroll.view"));
    const supabase = await getAuthenticatedSupabase();
    await syncActiveEmployeesIntoPayrollRun(supabase, profile, payrollId);
    return getPayrollRunById(supabase, profile, payrollId);
  } catch (error) {
    throw new Error(toUserFriendlyError(error, "Failed to load payroll details"));
  }
}

export async function fetchPayslipDetailAction(
  payslipId: string,
): Promise<PayslipDetail | null> {
  const profile = await requireServerAnyPermission([
    "payslip.view",
    "payroll.view",
    ...ceoOrViewPermission("payroll.view"),
  ]);
  const supabase = await getAuthenticatedSupabase();
    return getPayslipById(supabase, profile, payslipId, { bypassAccessCheck: true });
}

export async function fetchPayrollLookupsAction(): Promise<PayrollLookups> {
  const profile = await requireServerAnyPermission(ceoOrViewPermission("payroll.view"));
  const supabase = await getAuthenticatedSupabase();
  return getPayrollLookups(supabase, profile.employee.organizationId);
}

export async function fetchPayslipsAction(
  params: PayrollListParams,
): Promise<PayslipListResult> {
  const profile = await requireServerAnyPermission([
    "payslip.view",
    "payroll.view",
    ...ceoOrViewPermission("payroll.view"),
  ]);
  const supabase = await getAuthenticatedSupabase();
  return listPayslips(supabase, profile, payrollListParamsSchema.parse(params));
}

export async function fetchSalaryStructuresAction(
  params: { page?: number; pageSize?: number; search?: string; employeeId?: string },
): Promise<SalaryStructureListResult> {
  const profile = await requireServerAnyPermission([
    "salary.view",
    "salary_structure.view",
  ]);
  const supabase = await getAuthenticatedSupabase();
  return listSalaryStructures(
    supabase,
    profile,
    salaryStructureListParamsSchema.parse(params),
  );
}

export async function fetchBonusesAction(
  params: Record<string, unknown>,
): Promise<BonusListResult> {
  const profile = await requireServerAnyPermission([
    "bonus.view",
    "payroll.view",
    ...ceoOrViewPermission("payroll.view"),
  ]);
  const supabase = await getAuthenticatedSupabase();
  return listBonuses(supabase, profile, bonusListParamsSchema.parse(params));
}

export async function fetchReimbursementsAction(
  params: Record<string, unknown>,
): Promise<ReimbursementListResult> {
  const profile = await requireServerAnyPermission([
    "reimbursement.view",
    "payroll.view",
    ...ceoOrViewPermission("payroll.view"),
  ]);
  const supabase = await getAuthenticatedSupabase();
  return listReimbursements(
    supabase,
    profile,
    reimbursementListParamsSchema.parse(params),
  );
}

export async function fetchSalaryRevisionsAction(
  params: Record<string, unknown>,
): Promise<SalaryRevisionListResult> {
  const profile = await requireServerAnyPermission([
    "salary.view",
    "salary_structure.view",
  ]);
  const supabase = await getAuthenticatedSupabase();
  return listSalaryRevisions(
    supabase,
    profile,
    salaryRevisionListParamsSchema.parse(params),
  );
}

export async function fetchPayrollSettingsAction(): Promise<PayrollSettingsRecord> {
  const profile = await requireServerAnyPermission(ceoOrViewPermission("payroll.view"));
  const supabase = await getAuthenticatedSupabase();
  return getPayrollSettings(supabase, profile.employee.organizationId);
}

export async function savePayrollSettingsAction(
  input: unknown,
): Promise<PayrollActionResult<PayrollSettingsRecord>> {
  try {
    const profile = await requireServerAnyPermission([
      "settings.edit",
      "settings.manage",
      "payroll.edit",
      "payroll.approve",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollSettingsSchema.parse(input);
    const data = await savePayrollSettings(supabase, profile, parsed);
    revalidatePath(PAYROLL_ROUTES.settings);
    revalidatePath("/dashboard/company-settings");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        toUserFriendlyError(error, "Failed to save payroll settings"),
    };
  }
}

export async function uploadBonusAttachmentAction(
  formData: FormData,
): Promise<PayrollActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "bonus.create",
      "payroll.create",
    ]);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, message: "No file provided" };
    }

    const supabase = await getAuthenticatedSupabase();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${profile.employee.organizationId}/bonuses/${crypto.randomUUID()}-${sanitizedName}`;

    const { error } = await supabase.storage
      .from("employee-documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) throw new Error(error.message);
    return { success: true, data: storagePath };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to upload attachment"),
    };
  }
}

export async function fetchEmployeeAccountsAction(
  params: Record<string, unknown>,
): Promise<EmployeeAccountListResult> {
  const profile = await requireServerAnyPermission([
    "bank_account.view",
    "payroll.view",
    ...ceoOrViewPermission("payroll.view"),
  ]);
  const supabase = await getAuthenticatedSupabase();
  return listEmployeeAccounts(
    supabase,
    profile,
    employeeAccountListParamsSchema.parse(params),
  );
}

export async function upsertEmployeeAccountAction(
  input: unknown,
): Promise<PayrollActionResult<{ employeeId: string }>> {
  try {
    const profile = await requireServerAnyPermission([
      "bank_account.edit",
      "bank_account.create",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = employeeAccountFormSchema.parse(input);
    const data = await upsertEmployeeAccount(supabase, profile, parsed);
    revalidateEmployeeAccountViews();
    revalidateEmployeePayrollViews();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to save employee account details"),
    };
  }
}
