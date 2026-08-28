import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { initializeEmployeeLeaveBalances } from "@/lib/leave/services/leave-mutations";
import {
  assertOnboardingProvisioningEligible,
} from "@/lib/onboarding/provisioning-eligibility";
import { activateOnboardingCase } from "@/lib/onboarding/services/onboarding-mutations";
import { getOnboardingCaseDetail } from "@/lib/onboarding/services/onboarding-queries";
import { createSalaryStructure } from "@/lib/payroll/services/payroll-mutations";
import { getInviteableRoleById } from "@/lib/auth/iam-roles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";
import type { ProvisionOnboardingCandidateInput } from "@/lib/validations/onboarding-provisioning";

export async function provisionOnboardingCandidate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ProvisionOnboardingCandidateInput,
): Promise<{ employeeId: string; companyEmail: string; fullName: string }> {
  const organizationId = profile.employee.organizationId;
  const detail = await getOnboardingCaseDetail(supabase, organizationId, input.caseId);
  await assertOnboardingProvisioningEligible(detail);

  const role = await getInviteableRoleById(
    createAdminClient(),
    organizationId,
    input.roleId,
  );

  const employeeId = await activateOnboardingCase(
    supabase,
    profile,
    input.caseId,
    input.companyEmail,
    input.hrComments ?? null,
    input.roleId,
  );

  await createSalaryStructure(supabase, profile, {
    employeeId,
    effectiveFrom: input.salaryEffectiveFrom,
    effectiveTo: input.salaryEffectiveTo ?? undefined,
    currencyCode: input.currencyCode ?? "INR",
    basicSalary: input.basicSalary,
    hraAmount: input.hraAmount ?? 0,
    transportAllowance: input.transportAllowance ?? 0,
    otherAllowances: input.otherAllowances ?? 0,
  });

  await initializeEmployeeLeaveBalances(supabase, profile, employeeId);

  const ctx = await getRequestAuditContext();
  await writeApplicationAudit(supabase, {
    organizationId,
    module: "security",
    action: "onboarding_provisioned",
    description: `Provisioned ${detail.fullName} (${input.companyEmail}) as ${role.name}`,
    recordId: employeeId,
    priority: "high",
    ...ctx,
    metadata: {
      caseId: input.caseId,
      roleId: input.roleId,
      roleCode: role.code,
      companyEmail: input.companyEmail,
    },
  });

  return {
    employeeId,
    companyEmail: input.companyEmail.trim().toLowerCase(),
    fullName: detail.fullName,
  };
}
