import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getPasswordResetRedirectTo } from "@/lib/auth/reset-redirect";
import { siteConfig } from "@/config/site";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import type { ApplicationAuditInput } from "@/lib/audit/services/audit-utils";
import { createNotification } from "@/lib/notifications/services/notification-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/types/auth";
import type { EmployeeAccountStatus } from "@/types/employee";

type AccountAction =
  | "invitation_sent"
  | "invitation_resent"
  | "invitation_cancelled"
  | "account_activated"
  | "password_reset"
  | "account_suspended"
  | "account_activated_again"
  | "account_deactivated";

type EmployeeAccountRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  employment_status?: string;
  account_status: EmployeeAccountStatus;
  first_login_at: string | null;
  deleted_at: string | null;
};

function toNamePart(value: string) {
  const cleaned = value.replace(/[^a-zA-Z]+/g, " ").trim();
  if (!cleaned) return "Employee";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

function deriveNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "employee";
  const parts = local.split(/[._+-]+/).filter(Boolean);
  const firstName = toNamePart(parts[0] ?? "Employee");
  const lastName = parts.length > 1 ? parts.slice(1).map(toNamePart).join(" ") : "Employee";
  return { firstName, lastName };
}

const INVITE_REDIRECT_TO = getPasswordResetRedirectTo(true);
const RESET_REDIRECT_TO = getPasswordResetRedirectTo();

function fullName(employee: Pick<EmployeeAccountRow, "first_name" | "last_name">) {
  return `${employee.first_name} ${employee.last_name}`.trim();
}

async function getEmployeeAccountRow(
  employeeId: string,
  organizationId: string,
): Promise<EmployeeAccountRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("employees")
    .select(
      "id, organization_id, user_id, employee_code, first_name, last_name, email, employment_status, account_status, first_login_at, deleted_at",
    )
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.deleted_at) throw new Error("Employee not found");
  return data as EmployeeAccountRow;
}

async function ensureEmployeeRole(
  userId: string,
  employee: EmployeeAccountRow,
  actorUserId: string,
  roleCode: string = "employee",
) {
  const admin = createAdminClient();
  const { data: role, error: roleError } = await admin
    .schema("hrms")
    .from("roles")
    .select("id")
    .eq("organization_id", employee.organization_id)
    .eq("code", roleCode)
    .is("deleted_at", null)
    .maybeSingle();

  if (roleError) throw new Error(roleError.message);
  if (!role?.id) throw new Error(`Role "${roleCode}" is not configured for this organization`);

  const { data: existing, error: findError } = await admin
    .schema("hrms")
    .from("user_roles")
    .select("id")
    .eq("organization_id", employee.organization_id)
    .eq("user_id", userId)
    .eq("role_id", role.id)
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (existing?.id) {
    const { error } = await admin
      .schema("hrms")
      .from("user_roles")
      .update({
        employee_id: employee.id,
        status: "active",
        deleted_at: null,
        updated_by: actorUserId,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.schema("hrms").from("user_roles").insert({
      organization_id: employee.organization_id,
      user_id: userId,
      employee_id: employee.id,
      role_id: role.id,
      status: "active",
      created_by: actorUserId,
      updated_by: actorUserId,
      deleted_at: null,
    });

  if (error) throw new Error(error.message);
}

async function writeAccountAudit(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employee: EmployeeAccountRow,
  action: AccountAction,
  description: string,
  metadata: Record<string, unknown> = {},
) {
  const input: ApplicationAuditInput = {
    organizationId: profile.employee.organizationId,
    module: "employees",
    action,
    description,
    recordId: employee.id,
    priority: action === "account_suspended" || action === "account_deactivated" ? "high" : "medium",
    metadata: {
      employeeId: employee.id,
      employeeCode: employee.employee_code,
      employeeEmail: employee.email,
      ...metadata,
    },
  };
  await writeApplicationAudit(supabase, input);
}

async function notifyEmployeeAccount(
  employee: EmployeeAccountRow,
  type: string,
  title: string,
  message: string,
  actorUserId: string | null,
) {
  if (!employee.user_id) return;
  const admin = createAdminClient();
  await createNotification(admin as unknown as AuthSupabaseClient, {
    organizationId: employee.organization_id,
    userId: employee.user_id,
    employeeId: employee.id,
    title,
    message,
    notificationType: type,
    module: "security",
    priority: type.includes("suspended") ? "high" : "medium",
    actionUrl: `/dashboard/employees`,
    createdBy: actorUserId,
    sourceEventKey: `${type}:${employee.id}:${Date.now()}`,
  });
}

async function updateEmployeeAccount(
  employeeId: string,
  values: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .schema("hrms")
    .from("employees")
    .update(values)
    .eq("id", employeeId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

async function updateEmployeeAccountWithClient(
  supabase: AuthSupabaseClient,
  employeeId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabase
    .schema("hrms")
    .from("employees")
    .update(values)
    .eq("id", employeeId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

async function sendSupabaseInvite(employee: EmployeeAccountRow) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(employee.email, {
    redirectTo: INVITE_REDIRECT_TO,
    data: {
      employee_id: employee.id,
      employee_code: employee.employee_code,
      full_name: fullName(employee),
      organization_id: employee.organization_id,
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user?.id) throw new Error("Supabase did not return an invited user");
  return data.user.id;
}

export async function sendEmployeeInvitation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  roleCode: string = "employee",
) {
  const employee = await getEmployeeAccountRow(employeeId, profile.employee.organizationId);
  if (!["draft", "invited"].includes(employee.account_status)) {
    throw new Error("Invitation can only be sent for draft employees");
  }

  const authUserId = employee.user_id ?? (await sendSupabaseInvite(employee));
  await ensureEmployeeRole(authUserId, employee, profile.userId, roleCode);

  const now = new Date().toISOString();
  await updateEmployeeAccount(employee.id, {
    user_id: authUserId,
    account_status: "invitation_pending",
    invitation_sent_at: now,
    invitation_cancelled_at: null,
    updated_by: profile.userId,
  });

  const updatedEmployee = { ...employee, user_id: authUserId };
  await notifyEmployeeAccount(
    updatedEmployee,
    "employee_invitation_sent",
    "Employee account invitation sent",
    `Your ${siteConfig.name} account invitation has been sent to ${employee.email}.`,
    profile.userId,
  );
  await writeAccountAudit(
    supabase,
    profile,
    updatedEmployee,
    "invitation_sent",
    `Invitation sent to ${fullName(employee)} (${employee.employee_code})`,
  );
}

async function suggestEmployeeCodeForInvite(organizationId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .schema("hrms")
    .from("employees")
    .select("employee_code")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("employee_code", { ascending: false })
    .limit(1);

  const latest = data?.[0]?.employee_code ?? "";
  const match = latest.match(/(\d+)$/);
  if (!match) return "EMP-0001";
  return `EMP-${String(Number.parseInt(match[1], 10) + 1).padStart(4, "0")}`;
}

export type InviteEmployeeByEmailOptions = {
  reportingManagerId?: string;
  departmentId?: string | null;
  branchId?: string | null;
  designationId?: string | null;
  employmentTypeId?: string | null;
  roleCode?: string;
};

async function applyTeamInvitePlacement(
  employeeId: string,
  options: InviteEmployeeByEmailOptions,
  actorUserId: string,
) {
  if (!options.reportingManagerId) return;

  const admin = createAdminClient();
  const { error } = await admin
    .schema("hrms")
    .from("employees")
    .update({
      reporting_manager_id: options.reportingManagerId,
      ...(options.departmentId ? { department_id: options.departmentId } : {}),
      ...(options.branchId ? { branch_id: options.branchId } : {}),
      updated_by: actorUserId,
    })
    .eq("id", employeeId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function inviteEmployeeByEmail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  emailInput: string,
  options: InviteEmployeeByEmailOptions = {},
) {
  const email = emailInput.trim().toLowerCase();
  const roleCode = options.roleCode ?? "employee";
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .schema("hrms")
    .from("employees")
    .select(
      "id, organization_id, user_id, employee_code, first_name, last_name, email, account_status, first_login_at, deleted_at",
    )
    .eq("organization_id", profile.employee.organizationId)
    .ilike("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const row = existing as EmployeeAccountRow;
    if (
      row.account_status === "active" &&
      options.reportingManagerId &&
      row.id !== options.reportingManagerId
    ) {
      throw new Error("This email already belongs to an active employee. Contact HR for changes.");
    }

    if (options.reportingManagerId) {
      await applyTeamInvitePlacement(row.id, options, profile.userId);
    }

    if (row.account_status === "invitation_pending") {
      await resendEmployeeInvitation(supabase, profile, row.id, roleCode);
      return row.id;
    }
    if (row.account_status === "draft" || row.account_status === "invited") {
      await sendEmployeeInvitation(supabase, profile, row.id, roleCode);
      return row.id;
    }
    throw new Error("This employee already has an account workflow");
  }

  const { firstName, lastName } = deriveNameFromEmail(email);
  const employeeCode = await suggestEmployeeCodeForInvite(profile.employee.organizationId);
  const { data: created, error: createError } = await admin
    .schema("hrms")
    .from("employees")
    .insert({
      organization_id: profile.employee.organizationId,
      branch_id: options.branchId ?? profile.employee.branchId,
      department_id: options.departmentId ?? null,
      designation_id: options.designationId ?? null,
      employment_type_id: options.employmentTypeId ?? null,
      reporting_manager_id: options.reportingManagerId ?? null,
      employee_code: employeeCode,
      first_name: firstName,
      last_name: lastName,
      email,
      employment_status: "draft",
      account_status: "draft",
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(createError?.message ?? "Failed to create employee invite record");
  }

  await sendEmployeeInvitation(supabase, profile, created.id, roleCode);
  return created.id as string;
}

export async function resendEmployeeInvitation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  roleCode: string = "employee",
) {
  const employee = await getEmployeeAccountRow(employeeId, profile.employee.organizationId);
  if (employee.account_status !== "invitation_pending") {
    throw new Error("Only pending invitations can be resent");
  }

  let authUserId = employee.user_id;
  if (employee.user_id && !employee.first_login_at) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(employee.user_id);
    authUserId = null;
  }

  authUserId = await sendSupabaseInvite({ ...employee, user_id: authUserId });
  await ensureEmployeeRole(authUserId, employee, profile.userId, roleCode);

  const now = new Date().toISOString();
  await updateEmployeeAccount(employee.id, {
    user_id: authUserId,
    invitation_sent_at: now,
    updated_by: profile.userId,
  });

  const updatedEmployee = { ...employee, user_id: authUserId };
  await notifyEmployeeAccount(
    updatedEmployee,
    "employee_invitation_resent",
    "Employee account invitation resent",
    `Your ${siteConfig.name} account invitation was resent.`,
    profile.userId,
  );
  await writeAccountAudit(
    supabase,
    profile,
    updatedEmployee,
    "invitation_resent",
    `Invitation resent to ${fullName(employee)} (${employee.employee_code})`,
  );
}

export async function cancelEmployeeInvitation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
) {
  const employee = await getEmployeeAccountRow(employeeId, profile.employee.organizationId);
  if (employee.account_status !== "invitation_pending") {
    throw new Error("Only pending invitations can be cancelled");
  }

  const admin = createAdminClient();
  if (employee.user_id && !employee.first_login_at) {
    await admin.auth.admin.deleteUser(employee.user_id);
  }
  if (employee.user_id) {
    await admin
      .schema("hrms")
      .from("user_roles")
      .update({ status: "inactive", deleted_at: new Date().toISOString(), updated_by: profile.userId })
      .eq("organization_id", employee.organization_id)
      .eq("user_id", employee.user_id);
  }

  await updateEmployeeAccount(employee.id, {
    user_id: null,
    account_status: "draft",
    invitation_cancelled_at: new Date().toISOString(),
    updated_by: profile.userId,
  });
  await writeAccountAudit(
    supabase,
    profile,
    employee,
    "invitation_cancelled",
    `Invitation cancelled for ${fullName(employee)} (${employee.employee_code})`,
  );
}

export async function resetEmployeePassword(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
) {
  const employee = await getEmployeeAccountRow(employeeId, profile.employee.organizationId);
  if (employee.account_status !== "active" || !employee.user_id) {
    throw new Error("Password reset is available only for active accounts");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(employee.email, {
    redirectTo: RESET_REDIRECT_TO,
  });
  if (error) throw new Error(error.message);

  await updateEmployeeAccount(employee.id, {
    password_last_reset_at: new Date().toISOString(),
    updated_by: profile.userId,
  });
  await notifyEmployeeAccount(
    employee,
    "employee_password_reset",
    "Password reset email sent",
    `A password reset email was sent for your ${siteConfig.name} account.`,
    profile.userId,
  );
  await writeAccountAudit(
    supabase,
    profile,
    employee,
    "password_reset",
    `Password reset sent to ${fullName(employee)} (${employee.employee_code})`,
  );
}

async function setAuthBan(userId: string, banDuration: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banDuration,
  });
  if (error) throw new Error(error.message);
}

export async function suspendEmployeeAccount(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
) {
  const employee = await getEmployeeAccountRow(employeeId, profile.employee.organizationId);
  if (employee.account_status !== "active" || !employee.user_id) {
    throw new Error("Only active accounts can be suspended");
  }

  await setAuthBan(employee.user_id, "876000h");
  await updateEmployeeAccount(employee.id, {
    account_status: "suspended",
    account_suspended_at: new Date().toISOString(),
    updated_by: profile.userId,
  });
  await notifyEmployeeAccount(
    employee,
    "employee_account_suspended",
    "Account suspended",
    `Your ${siteConfig.name} login has been suspended by HR.`,
    profile.userId,
  );
  await writeAccountAudit(
    supabase,
    profile,
    employee,
    "account_suspended",
    `Account suspended for ${fullName(employee)} (${employee.employee_code})`,
  );
}

export async function deactivateEmployeeAccount(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
) {
  const employee = await getEmployeeAccountRow(employeeId, profile.employee.organizationId);
  if (employee.account_status !== "active" || !employee.user_id) {
    throw new Error("Only active accounts can be deactivated");
  }

  await setAuthBan(employee.user_id, "876000h");
  await updateEmployeeAccount(employee.id, {
    account_status: "inactive",
    account_deactivated_at: new Date().toISOString(),
    updated_by: profile.userId,
  });
  await writeAccountAudit(
    supabase,
    profile,
    employee,
    "account_deactivated",
    `Account deactivated for ${fullName(employee)} (${employee.employee_code})`,
  );
}

export async function activateEmployeeAccount(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
) {
  const employee = await getEmployeeAccountRow(employeeId, profile.employee.organizationId);
  if (!["suspended", "inactive"].includes(employee.account_status) || !employee.user_id) {
    throw new Error("Only suspended or inactive accounts can be activated");
  }

  await setAuthBan(employee.user_id, "none");
  await updateEmployeeAccount(employee.id, {
    account_status: "active",
    account_activated_at: new Date().toISOString(),
    updated_by: profile.userId,
  });
  await notifyEmployeeAccount(
    employee,
    "employee_account_activated",
    "Account activated",
    `Your ${siteConfig.name} login has been activated.`,
    profile.userId,
  );
  await writeAccountAudit(
    supabase,
    profile,
    employee,
    "account_activated_again",
    `Account activated again for ${fullName(employee)} (${employee.employee_code})`,
  );
}

export async function recordEmployeeSuccessfulLogin(
  supabase: AuthSupabaseClient,
  userId: string,
  email: string,
) {
  const { data: employee, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      "id, organization_id, user_id, employee_code, first_name, last_name, email, employment_status, account_status, first_login_at, date_of_joining, created_by, deleted_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !employee || employee.deleted_at) return;

  const employeeRow = employee as EmployeeAccountRow & { date_of_joining: string | null };
  const now = new Date().toISOString();
  const isFirstLogin = !employeeRow.first_login_at;
  const shouldActivate =
    employeeRow.account_status === "invited" || employeeRow.account_status === "invitation_pending";

  const updates: Record<string, unknown> = {
    last_login_at: now,
  };
  if (isFirstLogin) updates.first_login_at = now;
  if (employeeRow.employment_status === "draft") updates.employment_status = "active";
  if (shouldActivate) {
    updates.account_status = "active";
    updates.account_activated_at = now;
    if (!employeeRow.date_of_joining) {
      updates.date_of_joining = now.slice(0, 10);
    }
  }

  await updateEmployeeAccountWithClient(supabase, employeeRow.id, updates);

  if (shouldActivate) {
    await notifyEmployeeAccount(
      { ...employeeRow, account_status: "active" },
      "employee_invitation_accepted",
      "Invitation accepted",
      `Welcome to ${siteConfig.name}. Your employee account is active.`,
      userId,
    );
    await writeApplicationAudit(supabase, {
      organizationId: employeeRow.organization_id,
      module: "employees",
      action: "account_activated",
      description: `Invitation accepted and account activated for ${email}`,
      recordId: employeeRow.id,
      priority: "medium",
      metadata: {
        employeeId: employeeRow.id,
        employeeCode: employeeRow.employee_code,
        email,
      },
    });

    // Notify the inviter (e.g. the CEO) that the invitation was accepted.
    const inviterUserId = (employee as { created_by?: string | null }).created_by ?? null;
    if (inviterUserId && inviterUserId !== userId) {
      try {
        await createNotification(supabase, {
          organizationId: employeeRow.organization_id,
          userId: inviterUserId,
          employeeId: employeeRow.id,
          title: "Invitation accepted",
          message: `${fullName(employeeRow)} (${email}) accepted their invitation and activated their account.`,
          notificationType: "executive_invitation_accepted",
          module: "security",
          priority: "medium",
          sourceEventKey: `executive_invitation_accepted:${employeeRow.id}`,
          createdBy: userId,
        });
      } catch {
        // Notifying the inviter must never block a successful login.
      }
    }
  }
}
