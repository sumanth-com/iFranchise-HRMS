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
import { resolveOrCreateDesignation } from "@/lib/employees/services/employee-mutations";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInviteableRoleByCode } from "@/lib/auth/iam-roles";
import { assertProvisionableRole } from "@/lib/user-provisioning/provisionable-roles";
import { notifyProvisioningStakeholders } from "@/lib/user-provisioning/notifications";
import type { UserProfile } from "@/types/auth";
import { ROLE_LABELS } from "@/types/ceo-user-provisioning";
import type { InviteExecutiveUserInput } from "@/lib/validations/ceo-user-provisioning";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

async function resolveEmployeeRoleCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
): Promise<string | null> {
  const { data } = await fromHrms(supabase, "user_roles")
    .select("roles:role_id ( code )")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("status", "active")
    .is("deleted_at", null);

  let best: string | null = null;
  let bestPriority = 99;
  const priority: Record<string, number> = {
    founder: 0,
    co_founder: 1,
    ceo: 2,
    hr_admin: 3,
    hr_executive: 4,
    manager: 5,
  };

  for (const row of (data ?? []) as LooseRow[]) {
    const code = unwrapRelation<LooseRow>(row.roles)?.code as string | undefined;
    if (!code) continue;
    const rank = priority[code] ?? 99;
    if (!best || rank < bestPriority) {
      best = code;
      bestPriority = rank;
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

async function assertEmailAvailable(organizationId: string, email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("employees")
    .select("id, account_status")
    .eq("organization_id", organizationId)
    .ilike("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return;

  if (data.account_status === "invitation_pending" || data.account_status === "draft") {
    throw new Error(
      "This email already has a pending invitation. Resend or cancel it from the list.",
    );
  }

  throw new Error("This email is already registered in your organization.");
}

async function storeInvitationNotes(
  employeeId: string,
  notes: string | undefined,
  actorUserId: string,
) {
  if (!notes?.trim()) return;

  const admin = createAdminClient();
  const { error } = await admin
    .schema("hrms")
    .from("employees")
    .update({
      invitation_notes: notes.trim(),
      updated_by: actorUserId,
    })
    .eq("id", employeeId)
    .is("deleted_at", null);

  if (error && !error.message.includes("invitation_notes")) {
    throw new Error(error.message);
  }
}

export async function inviteExecutiveUser(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: InviteExecutiveUserInput,
): Promise<{ employeeId: string }> {
  const organizationId = profile.employee.organizationId;
  await assertEmailAvailable(organizationId, input.email);

  const role = await assertProvisionableRole(supabase, organizationId, input.roleCode);
  const designationId = await resolveOrCreateDesignation(
    supabase,
    organizationId,
    profile.userId,
    input.designation,
  );

  const employeeId = await inviteEmployeeByEmail(supabase, profile, input.email, {
    fullName: input.fullName,
    roleCode: role.code,
    departmentId: input.departmentId,
    designationId,
    branchId: input.branchId,
    employmentTypeId: input.employmentTypeId,
  });

  await storeInvitationNotes(employeeId, input.notes, profile.userId);

  const roleLabel = ROLE_LABELS[role.code] ?? role.name;

  await audit(
    supabase,
    profile,
    "invitation_sent",
    `Invited ${input.fullName} (${input.email}) as ${roleLabel}`,
    employeeId,
    {
      fullName: input.fullName,
      email: input.email,
      roleCode: role.code,
      portalKey: role.portalKey,
      departmentId: input.departmentId,
      designation: input.designation,
      branchId: input.branchId,
      employmentTypeId: input.employmentTypeId,
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
  const inviteRole = await getInviteableRoleByCode(
    createAdminClient(),
    profile.employee.organizationId,
    roleCode,
  );
  await resendEmployeeInvitation(supabase, profile, employeeId, inviteRole.id);
  await audit(
    supabase,
    profile,
    "invitation_resent",
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
  const admin = createAdminClient();
  const { data: employee } = await admin
    .schema("hrms")
    .from("employees")
    .select("first_name, last_name, email")
    .eq("id", employeeId)
    .maybeSingle();

  await cancelEmployeeInvitation(supabase, profile, employeeId);

  const fullName = employee
    ? `${employee.first_name} ${employee.last_name}`.trim()
    : "User";

  await notifyProvisioningStakeholders(supabase, {
    organizationId: profile.employee.organizationId,
    event: "invitation_rejected",
    subjectName: fullName,
    subjectEmail: employee?.email ?? "",
    employeeId,
    actorUserId: profile.userId,
  });

  await audit(
    supabase,
    profile,
    "invitation_cancelled",
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
    "account_suspended",
    `Suspended executive account`,
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
  const admin = createAdminClient();
  const { data: employee } = await admin
    .schema("hrms")
    .from("employees")
    .select("first_name, last_name, email")
    .eq("id", employeeId)
    .maybeSingle();

  await activateEmployeeAccount(supabase, profile, employeeId);

  const fullName = employee
    ? `${employee.first_name} ${employee.last_name}`.trim()
    : "User";

  await notifyProvisioningStakeholders(supabase, {
    organizationId: profile.employee.organizationId,
    event: "account_activated",
    subjectName: fullName,
    subjectEmail: employee?.email ?? "",
    employeeId,
    actorUserId: profile.userId,
  });

  await audit(
    supabase,
    profile,
    "account_reactivated",
    `Reactivated executive account`,
    employeeId,
    { employeeId },
  );
}

export async function notifyExecutiveAccountActivated(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
) {
  const admin = createAdminClient();
  const { data: employee } = await admin
    .schema("hrms")
    .from("employees")
    .select("first_name, last_name, email")
    .eq("id", employeeId)
    .maybeSingle();

  if (!employee) return;

  const subjectName = `${employee.first_name} ${employee.last_name}`.trim();

  await notifyProvisioningStakeholders(supabase, {
    organizationId: profile.employee.organizationId,
    event: "invitation_accepted",
    subjectName,
    subjectEmail: employee.email,
    employeeId,
    actorUserId: profile.userId,
  });

  await notifyProvisioningStakeholders(supabase, {
    organizationId: profile.employee.organizationId,
    event: "account_activated",
    subjectName,
    subjectEmail: employee.email,
    employeeId,
    actorUserId: profile.userId,
  });

  await audit(
    supabase,
    profile,
    "account_activated",
    `Executive account activated for ${subjectName}`,
    employeeId,
    { employeeId, email: employee.email },
    "high",
  );
}
