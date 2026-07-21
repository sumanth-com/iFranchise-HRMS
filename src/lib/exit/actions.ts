"use server";

import { revalidatePath } from "next/cache";

import { EXIT_ROUTES } from "@/lib/exit/constants";
import {
  approveSettlement,
  decideAssetReturn,
  decideClearance,
  decideResignation,
  generateExitDocuments,
  saveExitInterview,
  saveSettlement,
  submitResignation,
  withdrawResignation,
} from "@/lib/exit/services/exit-mutations";
import { getResignationById } from "@/lib/exit/services/exit-queries";
import {
  getExitSettings,
  updateExitSettings,
} from "@/lib/exit/services/exit-settings";
import { requireServerAnyPermission, requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  assetReturnDecisionSchema,
  clearanceDecisionSchema,
  exitSettingsSchema,
  interviewFormSchema,
  resignationDecisionSchema,
  resignationFormSchema,
  settlementFormSchema,
} from "@/lib/validations/exit";

function revalidateExit(employeeId?: string) {
  revalidatePath(EXIT_ROUTES.dashboard);
  revalidatePath(EXIT_ROUTES.resignations);
  revalidatePath(EXIT_ROUTES.clearance);
  revalidatePath(EXIT_ROUTES.assetReturn);
  revalidatePath(EXIT_ROUTES.settlement);
  revalidatePath(EXIT_ROUTES.interview);
  revalidatePath(EXIT_ROUTES.documents);
  revalidatePath(EXIT_ROUTES.settings);
  revalidatePath("/employee/resignation");
  revalidatePath("/employee/resignation/apply");
  revalidatePath("/manager/resignation");
  revalidatePath("/ceo/exit");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/assets-management");
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/documents-management");
  if (employeeId) {
    revalidatePath(`/dashboard/employees/${employeeId}`);
  }
}

export async function submitResignationAction(input: unknown) {
  try {
    const profile = await requireServerPermission("exit.create");
    const supabase = await createClient();
    const parsed = resignationFormSchema.parse(input);
    const id = await submitResignation(supabase, profile, parsed);
    revalidateExit(parsed.employeeId);
    return { success: true as const, data: id };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to submit resignation",
    };
  }
}

export async function managerDecideResignationAction(input: unknown) {
  try {
    const profile = await requireServerPermission("exit.approve");
    const supabase = await createClient();
    const parsed = resignationDecisionSchema.parse(input);
    await decideResignation(supabase, profile, parsed, "manager");
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to process manager decision",
    };
  }
}

export async function hrDecideResignationAction(input: unknown) {
  try {
    const profile = await requireServerPermission("exit.approve");
    const supabase = await createClient();
    const parsed = resignationDecisionSchema.parse(input);
    await decideResignation(supabase, profile, parsed, "hr");
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to process HR decision",
    };
  }
}

export async function ceoDecideResignationAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      "portal.ceo.access",
      "exit.approve",
    ]);
    const supabase = await createClient();
    const parsed = resignationDecisionSchema.parse(input);
    await decideResignation(supabase, profile, parsed, "ceo");
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to process CEO decision",
    };
  }
}

export async function withdrawResignationAction(resignationId: string) {
  try {
    const profile = await requireServerAnyPermission(["exit.create", "exit.approve"]);
    const supabase = await createClient();
    await withdrawResignation(supabase, profile, resignationId);
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to withdraw resignation",
    };
  }
}

export async function decideClearanceAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission(["exit.clearance", "exit.approve"]);
    const supabase = await createClient();
    const parsed = clearanceDecisionSchema.parse(input);
    await decideClearance(supabase, profile, parsed);
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update clearance",
    };
  }
}

export async function decideAssetReturnAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      "exit.clearance",
      "exit.approve",
      "asset.return",
    ]);
    const supabase = await createClient();
    const parsed = assetReturnDecisionSchema.parse(input);
    await decideAssetReturn(supabase, profile, parsed);
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update asset return",
    };
  }
}

export async function saveSettlementAction(input: unknown) {
  try {
    const profile = await requireServerPermission("exit.settlement");
    const supabase = await createClient();
    const parsed = settlementFormSchema.parse(input);
    await saveSettlement(supabase, profile, parsed);
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save settlement",
    };
  }
}

export async function approveSettlementAction(resignationId: string) {
  try {
    const profile = await requireServerPermission("exit.settlement");
    const supabase = await createClient();
    await approveSettlement(supabase, profile, resignationId);
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to approve settlement",
    };
  }
}

export async function saveExitInterviewAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      "exit.approve",
      "exit.create",
      "exit.settlement",
    ]);
    const supabase = await createClient();
    const parsed = interviewFormSchema.parse(input);
    await saveExitInterview(supabase, profile, parsed);
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save exit interview",
    };
  }
}

export async function generateExitDocumentsAction(resignationId: string) {
  try {
    const profile = await requireServerAnyPermission(["exit.documents", "exit.settlement"]);
    const supabase = await createClient();
    await generateExitDocuments(supabase, profile, resignationId);
    revalidateExit();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to generate documents",
    };
  }
}

export async function saveExitSettingsAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission(["exit.settings", "settings.manage"]);
    const supabase = await createClient();
    const parsed = exitSettingsSchema.parse(input);
    const data = await updateExitSettings(
      supabase,
      profile.employee.organizationId,
      profile.userId,
      parsed,
    );
    revalidateExit();
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save exit settings",
    };
  }
}

export async function getExitSettingsAction() {
  const profile = await requireServerAnyPermission(["exit.view", "exit.settings"]);
  const supabase = await createClient();
  return getExitSettings(supabase, profile.employee.organizationId);
}

export async function getResignationDetailAction(resignationId: string) {
  try {
    const profile = await requireServerPermission("exit.view");
    const supabase = await createClient();
    const data = await getResignationById(supabase, profile, resignationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load resignation",
      data: null,
    };
  }
}
