import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { getEmployeeSalaryStructure } from "@/lib/employees/services/employee-detail";
import { createSalaryRevision } from "@/lib/payroll/services/payroll-mutations";
import { fromHrms } from "@/lib/performance/services/performance-utils";

type SalaryComponents = {
  specialAllowance?: number;
  medical?: number;
  pf?: number;
  esi?: number;
  professionalTax?: number;
  incomeTax?: number;
  other?: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function buildRevisionInputFromGross(
  employeeId: string,
  newGross: number,
  reason: string,
  currentStructure: Awaited<ReturnType<typeof getEmployeeSalaryStructure>> | null,
) {
  const effectiveFrom = new Date().toISOString().slice(0, 10);

  if (!currentStructure || currentStructure.grossSalary <= 0) {
    return {
      employeeId,
      effectiveFrom,
      reason,
      basicSalary: newGross,
      hraAmount: 0,
      transportAllowance: 0,
      otherAllowances: 0,
    };
  }

  const ratio = newGross / currentStructure.grossSalary;
  const comps = currentStructure.components as SalaryComponents;
  const special = Number(comps.specialAllowance ?? 0);
  const medical = Number(comps.medical ?? 0);
  const baseOther = currentStructure.otherAllowances - special - medical;

  const scaled = {
    basicSalary: roundMoney(currentStructure.basicSalary * ratio),
    hraAmount: roundMoney(currentStructure.hraAmount * ratio),
    transportAllowance: roundMoney(currentStructure.transportAllowance * ratio),
    otherAllowances: roundMoney(baseOther * ratio),
    specialAllowance: roundMoney(special * ratio),
    medical: roundMoney(medical * ratio),
    pf: roundMoney(Number(comps.pf ?? 0) * ratio),
    esi: roundMoney(Number(comps.esi ?? 0) * ratio),
    professionalTax: roundMoney(Number(comps.professionalTax ?? 0) * ratio),
    incomeTax: roundMoney(Number(comps.incomeTax ?? 0) * ratio),
    other: roundMoney(Number(comps.other ?? 0) * ratio),
  };

  return {
    employeeId,
    effectiveFrom,
    reason,
    currencyCode: currentStructure.currencyCode,
    basicSalary: scaled.basicSalary,
    hraAmount: scaled.hraAmount,
    transportAllowance: scaled.transportAllowance,
    otherAllowances: scaled.otherAllowances,
    components: {
      specialAllowance: scaled.specialAllowance,
      medical: scaled.medical,
      pf: scaled.pf,
      esi: scaled.esi,
      professionalTax: scaled.professionalTax,
      incomeTax: scaled.incomeTax,
      other: scaled.other,
    },
  };
}

export async function applyPromotionDesignation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  designationId: string | null,
) {
  if (!designationId) return;

  const { error } = await fromHrms(supabase, "employees")
    .update({
      designation_id: designationId,
      updated_by: profile.userId,
    })
    .eq("id", employeeId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function applyPromotionSalary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  recommendedSalary: number,
  reason: string,
) {
  if (recommendedSalary <= 0) return;

  const currentStructure = await getEmployeeSalaryStructure(supabase, employeeId);
  const currentGross = currentStructure?.grossSalary ?? 0;

  if (currentGross > 0 && roundMoney(currentGross) === roundMoney(recommendedSalary)) {
    return;
  }

  const revisionInput = buildRevisionInputFromGross(
    employeeId,
    recommendedSalary,
    reason,
    currentStructure,
  );

  await createSalaryRevision(supabase, profile, revisionInput);
}

export async function applyPromotionCompensation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    promotionId: string;
    employeeId: string;
    recommendedDesignationId?: string | null;
    recommendedSalary?: number | null;
    reason?: string | null;
    applyDesignation?: boolean;
    applySalary?: boolean;
  },
) {
  const revisionReason =
    input.reason?.trim() || "Salary revision from approved promotion recommendation";

  if (input.applyDesignation) {
    await applyPromotionDesignation(
      supabase,
      profile,
      input.employeeId,
      input.recommendedDesignationId ?? null,
    );
  }

  if (input.applySalary && input.recommendedSalary != null && input.recommendedSalary > 0) {
    await applyPromotionSalary(
      supabase,
      profile,
      input.employeeId,
      input.recommendedSalary,
      revisionReason,
    );
  }

  const { error } = await fromHrms(supabase, "performance_promotions")
    .update({
      promotion_status: "applied",
      updated_by: profile.userId,
    })
    .eq("id", input.promotionId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}
