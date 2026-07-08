"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
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
  emailPayslip,
  generatePayrollRun,
  markPayrollPaid,
  previewPayrollRun,
  processPayrollRun,
  rejectPayrollRun,
} from "@/lib/payroll/services/payroll-mutations";
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
} from "@/lib/payroll/services/payroll-queries";
import {
  bonusFormSchema,
  bonusListParamsSchema,
  payrollApprovalSchema,
  payrollListParamsSchema,
  payrollRejectSchema,
  payrollRunSchema,
  reimbursementFormSchema,
  reimbursementListParamsSchema,
  salaryRevisionFormSchema,
  salaryRevisionListParamsSchema,
  salaryStructureFormSchema,
  salaryStructureListParamsSchema,
} from "@/lib/validations/payroll";
import { payrollSettingsSchema } from "@/lib/validations/payroll-settings";
import type {
  BonusListResult,
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
  SalaryStructureListResult,
} from "@/types/payroll";
import type { PayrollSettingsRecord } from "@/types/payroll-settings";

async function getAuthenticatedSupabase() {
  return createClient();
}

function revalidatePayrollPaths() {
  revalidatePath(PAYROLL_ROUTES.dashboard);
  revalidatePath(PAYROLL_ROUTES.history);
  revalidatePath(PAYROLL_ROUTES.run);
  revalidatePath(PAYROLL_ROUTES.payslips);
}

export async function previewPayrollRunAction(
  input: unknown,
): Promise<PayrollActionResult<PayrollPreviewResult>> {
  try {
    const profile = await requireServerAnyPermission([
      "payroll.run",
      "payroll.process",
      "payroll.generate",
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollRunSchema.parse(input);
    const data = await previewPayrollRun(supabase, profile, parsed);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to preview payroll",
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
    ]);
    const supabase = await getAuthenticatedSupabase();
    const parsed = payrollRunSchema.parse(input);
    const id = await generatePayrollRun(supabase, profile, parsed);
    revalidatePayrollPaths();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate payroll",
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
    ]);
    const supabase = await getAuthenticatedSupabase();
    await processPayrollRun(supabase, profile, payrollId);
    revalidatePayrollPaths();
    revalidatePath(PAYROLL_ROUTES.detail(payrollId));
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process payroll",
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
      message: error instanceof Error ? error.message : "Failed to approve payroll",
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
      message: error instanceof Error ? error.message : "Failed to reject payroll",
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
      message: error instanceof Error ? error.message : "Failed to mark payroll as paid",
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
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create salary structure",
    };
  }
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
      message: error instanceof Error ? error.message : "Failed to create salary revision",
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
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create bonus",
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
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to approve bonus",
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
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create reimbursement",
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
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to approve reimbursement",
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
    await emailPayslip(supabase, profile, payslipId);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to email payslip",
    };
  }
}

export async function fetchPayrollSummaryAction(
  month?: number,
  year?: number,
): Promise<PayrollSummary> {
  const profile = await requireServerPermission("payroll.view");
  const supabase = await getAuthenticatedSupabase();
  return getPayrollSummary(supabase, profile, month, year);
}

export async function fetchPayrollRunsAction(
  params: PayrollListParams,
): Promise<PayrollListResult> {
  const profile = await requireServerPermission("payroll.view");
  const supabase = await getAuthenticatedSupabase();
  return listPayrollRuns(supabase, profile, payrollListParamsSchema.parse(params));
}

export async function fetchPayrollDetailAction(
  payrollId: string,
): Promise<PayrollDetail | null> {
  const profile = await requireServerPermission("payroll.view");
  const supabase = await getAuthenticatedSupabase();
  return getPayrollRunById(supabase, profile, payrollId);
}

export async function fetchPayslipDetailAction(
  payslipId: string,
): Promise<PayslipDetail | null> {
  const profile = await requireServerAnyPermission([
    "payslip.view",
    "payroll.view",
  ]);
  const supabase = await getAuthenticatedSupabase();
  return getPayslipById(supabase, profile, payslipId);
}

export async function fetchPayrollLookupsAction(): Promise<PayrollLookups> {
  const profile = await requireServerPermission("payroll.view");
  const supabase = await getAuthenticatedSupabase();
  return getPayrollLookups(supabase, profile.employee.organizationId);
}

export async function fetchPayslipsAction(
  params: PayrollListParams,
): Promise<PayslipListResult> {
  const profile = await requireServerAnyPermission([
    "payslip.view",
    "payroll.view",
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
  const profile = await requireServerAnyPermission(["bonus.view", "payroll.view"]);
  const supabase = await getAuthenticatedSupabase();
  return listBonuses(supabase, profile, bonusListParamsSchema.parse(params));
}

export async function fetchReimbursementsAction(
  params: Record<string, unknown>,
): Promise<ReimbursementListResult> {
  const profile = await requireServerAnyPermission([
    "reimbursement.view",
    "payroll.view",
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
  const profile = await requireServerPermission("payroll.view");
  const supabase = await getAuthenticatedSupabase();
  return getPayrollSettings(supabase, profile.employee.organizationId);
}

export async function savePayrollSettingsAction(
  input: unknown,
): Promise<PayrollActionResult<PayrollSettingsRecord>> {
  try {
    const profile = await requireServerAnyPermission([
      "settings.manage",
      "payroll.edit",
      "payroll.approve",
    ]);
    const supabase = await getAuthenticatedSupabase();
    payrollSettingsSchema.parse(input);
    const data = await savePayrollSettings(supabase, profile, input);
    revalidatePath(PAYROLL_ROUTES.settings);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save payroll settings",
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
      message: error instanceof Error ? error.message : "Failed to upload attachment",
    };
  }
}
