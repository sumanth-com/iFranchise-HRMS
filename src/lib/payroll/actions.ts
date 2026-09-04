"use server";

import { revalidatePath } from "next/cache";

import { siteConfig } from "@/config/site";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { ceoOrViewPermission } from "@/lib/ceo/read-only-permissions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { createClient } from "@/lib/supabase/server";
import { toUserFriendlyError } from "@/lib/errors/user-messages";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { PAYROLL_ROUTES, payrollTeamSectionPath, SELF_PAYROLL_ROUTES, TEAM_PAYROLL_SECTIONS } from "@/lib/payroll/constants";
import {
  getPayrollRunById,
  getPayslipById,
} from "@/lib/payroll/services/payroll-detail";
import {
  approveBonus,
  approvePayrollStep,
  approveReimbursement,
  createBonus,
  createReimbursement,
  createSalaryRevision,
  createSalaryStructure,
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
  releaseEmployeePayslip,
  ensureUnpublishedPayslipForPayrollItem,
  syncActiveEmployeesIntoPayrollRun,
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
  payrollApprovalSchema,
  payrollItemAdjustmentSchema,
  payrollListParamsSchema,
  payrollRejectSchema,
  payrollRunSchema,
  reimbursementFormSchema,
  reimbursementListParamsSchema,
  salaryRevisionFormSchema,
  salaryRevisionListParamsSchema,
  salaryStructureFormSchema,
  salaryStructureListParamsSchema,
  employeeAccountFormSchema,
  employeeAccountListParamsSchema,
  sendEmployeePayslipSchema,
} from "@/lib/validations/payroll";
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
    const id = await createReimbursement(supabase, profile, parsed);
    revalidatePath(PAYROLL_ROUTES.reimbursements);
    revalidateEmployeePayrollViews();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: toUserFriendlyError(error, "Failed to create reimbursement"),
    };
  }
}

export async function approveReimbursementAction(
  reimbursementId: string,
): Promise<PayrollActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "reimbursement.approve",
      "payroll.approve",
    ]);
    const supabase = await getAuthenticatedSupabase();
    await approveReimbursement(supabase, profile, reimbursementId);
    revalidatePath(PAYROLL_ROUTES.reimbursements);
    revalidateEmployeePayrollViews();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message:
        toUserFriendlyError(error, "Failed to approve reimbursement"),
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
