import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import {
  activateEmployeeAccount,
  cancelEmployeeInvitation,
  deactivateEmployeeAccount,
  inviteEmployeeByEmail,
  resendEmployeeInvitation,
} from "@/lib/employees/services/employee-account";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import type { UserProfile } from "@/types/auth";
import {
  EXECUTIVE_ROLE_CODES,
  ROLE_LABELS,
  type ExecutiveRoleCode,
} from "@/types/ceo-user-provisioning";
import type { InviteExecutiveUserInput } from "@/lib/validations/ceo-user-provisioning";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const EXECUTIVE_ROLE_SET = new Set<string>(EXECUTIVE_ROLE_CODES);

const ROLE_PRIORITY: Record<ExecutiveRoleCode, number> = {
  founder: 0,
  co_founder: 1,
  ceo: 2,
  hr_admin: 3,
  hr_executive: 4,
  manager: 5,
};

async function resolveEmployeeRoleCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
): Promise<ExecutiveRoleCode | null> {
  const { data } = await fromHrms(supabase, "user_roles")
    .select("roles:role_id ( code )")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("status", "active")
    .is("deleted_at", null);

  let best: ExecutiveRoleCode | null = null;
  for (const row of (data ?? []) as LooseRow[]) {
    const code = unwrapRelation<LooseRow>(row.roles)?.code as string | undefined;
    if (!code || !EXECUTIVE_ROLE_SET.has(code)) continue;
    if (
      !best ||
      ROLE_PRIORITY[code as ExecutiveRoleCode] < ROLE_PRIORITY[best]
    ) {
      best = code as ExecutiveRoleCode;
    }
  }
  return best;
}

async function audit(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  action: string,
  description: string,
  recordId: string,
  metadata: Record<string, unknown>,
  priority: "low" | "medium" | "high" = "medium",
) {
  const ctx = await getRequestAuditContext();
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "security",
    action,
    description,
    recordId,
    priority,
    ...ctx,
    metadata,
  });
}

export async function inviteExecutiveUser(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: InviteExecutiveUserInput,
): Promise<{ employeeId: string }> {
  const employeeId = await inviteEmployeeByEmail(supabase, profile, input.email, {
    roleCode: input.roleCode,
    departmentId: input.departmentId,
    designationId: input.designationId,
    branchId: input.branchId,
    employmentTypeId: input.employmentTypeId ?? null,
    reportingManagerId: input.reportingToId,
  });

  const roleLabel = ROLE_LABELS[input.roleCode as ExecutiveRoleCode] ?? input.roleCode;

  await audit(
    supabase,
    profile,
    "user_provisioning_invite",
    `Invited ${input.email} as ${roleLabel}`,
    employeeId,
    {
      email: input.email,
      roleCode: input.roleCode,
      departmentId: input.departmentId,
      designationId: input.designationId,
      branchId: input.branchId,
      reportingToId: input.reportingToId ?? null,
      notes: input.notes ?? null,
    },
    "high",
  );

  return { employeeId };
}

export async function resendExecutiveInvitation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<void> {
  const roleCode =
    (await resolveEmployeeRoleCode(
      supabase,
      profile.employee.organizationId,
      employeeId,
    )) ?? "manager";
  await resendEmployeeInvitation(supabase, profile, employeeId, roleCode);
  await audit(
    supabase,
    profile,
    "user_provisioning_resend",
    `Resent invitation for executive user`,
    employeeId,
    { employeeId, roleCode },
  );
}

export async function cancelExecutiveInvitation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<void> {
  await cancelEmployeeInvitation(supabase, profile, employeeId);
  await audit(
    supabase,
    profile,
    "user_provisioning_cancel",
    `Cancelled invitation for executive user`,
    employeeId,
    { employeeId },
    "high",
  );
}

export async function deactivateExecutiveUser(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<void> {
  await deactivateEmployeeAccount(supabase, profile, employeeId);
  await audit(
    supabase,
    profile,
    "user_provisioning_deactivate",
    `Deactivated executive account`,
    employeeId,
    { employeeId },
    "high",
  );
}

export async function reactivateExecutiveUser(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<void> {
  await activateEmployeeAccount(supabase, profile, employeeId);
  await audit(
    supabase,
    profile,
    "user_provisioning_reactivate",
    `Reactivated executive account`,
    employeeId,
    { employeeId },
  );
}
