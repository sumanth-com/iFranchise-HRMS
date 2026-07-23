import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { syncUserAuthRoleMetadata } from "@/lib/auth/sync-user-auth-role";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import type { UserProfile } from "@/types/auth";
import type { z } from "zod";
import {
  assignUserRoleSchema,
  roleFormSchema,
  rolePermissionsSchema,
} from "@/lib/validations/roles";
import {
  getRoleAncestorIds,
  getRolePermissionDetail,
} from "@/lib/roles/services/role-queries";
import { isSuperAdmin } from "@/lib/system-admin/is-super-admin";

type RoleInput = z.infer<typeof roleFormSchema>;

function auditFields(profile: UserProfile) {
  return { updated_by: profile.userId, updated_at: new Date().toISOString() };
}

async function assertUniqueRoleCode(
  supabase: AuthSupabaseClient,
  orgId: string,
  code: string,
  excludeId?: string,
) {
  let query = supabase
    .schema("hrms")
    .from("roles")
    .select("id")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .ilike("code", code.trim());

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.limit(1);
  if (data?.length) throw new Error("A role with this code already exists");
}

async function assertNoCircularInheritance(
  supabase: AuthSupabaseClient,
  roleId: string,
  parentRoleId: string | null,
  organizationId: string,
) {
  if (!parentRoleId) return;
  if (roleId === parentRoleId) {
    throw new Error("A role cannot inherit from itself");
  }

  const ancestors = await getRoleAncestorIds(supabase, parentRoleId, organizationId);
  if (ancestors.includes(roleId)) {
    throw new Error("This inheritance would create a circular dependency");
  }
}

export async function saveRole(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: RoleInput,
  id?: string,
) {
  const parsed = roleFormSchema.parse(input);
  const orgId = profile.employee.organizationId;

  await assertUniqueRoleCode(supabase, orgId, parsed.code, id);
  if (id) {
    await assertNoCircularInheritance(supabase, id, parsed.parentRoleId ?? null, orgId);
  }

  if (parsed.isDefault) {
    await supabase
      .schema("hrms")
      .from("roles")
      .update({ is_default: false, ...auditFields(profile) })
      .eq("organization_id", orgId)
      .is("deleted_at", null);
  }

  const payload = {
    name: parsed.name,
    code: parsed.code.toLowerCase(),
    description: parsed.description?.trim() || null,
    parent_role_id: parsed.parentRoleId ?? null,
    is_default: parsed.isDefault,
    status: parsed.status,
    ...auditFields(profile),
  };

  if (id) {
    const { data: existing } = await supabase
      .schema("hrms")
      .from("roles")
      .select("is_system_role")
      .eq("id", id)
      .maybeSingle();

    if (existing?.is_system_role) {
      const { error } = await supabase
        .schema("hrms")
        .from("roles")
        .update({
          name: payload.name,
          description: payload.description,
          parent_role_id: payload.parent_role_id,
          is_default: payload.is_default,
          status: payload.status,
          ...auditFields(profile),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    }

    const { error } = await supabase.schema("hrms").from("roles").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("roles")
    .insert({
      ...payload,
      organization_id: orgId,
      is_system_role: false,
      created_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteRole(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  roleId: string,
) {
  const orgId = profile.employee.organizationId;

  const { data: role } = await supabase
    .schema("hrms")
    .from("roles")
    .select("is_system_role, code")
    .eq("id", roleId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!role) throw new Error("Role not found");
  if (role.is_system_role) throw new Error("System roles cannot be deleted");

  const { count: userCount } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .is("deleted_at", null)
    .eq("status", "active");

  if ((userCount ?? 0) > 0) {
    throw new Error("Cannot delete a role assigned to users");
  }

  if (role.code === "super_admin") {
    throw new Error("Cannot delete the Super Admin role");
  }

  const { error } = await supabase
    .schema("hrms")
    .from("roles")
    .update({ deleted_at: new Date().toISOString(), status: "archived", ...auditFields(profile) })
    .eq("id", roleId);

  if (error) throw new Error(error.message);
}

export async function saveRolePermissions(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof rolePermissionsSchema>,
) {
  const parsed = rolePermissionsSchema.parse(input);
  const orgId = profile.employee.organizationId;

  const { data: role } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, code")
    .eq("id", parsed.roleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!role) throw new Error("Role not found");

  const { data: existing } = await supabase
    .schema("hrms")
    .from("role_permissions")
    .select("id, permission_id")
    .eq("role_id", parsed.roleId)
    .is("deleted_at", null);

  const existingMap = new Map((existing ?? []).map((r) => [r.permission_id, r.id]));
  const targetSet = new Set(parsed.permissionIds);

  for (const permId of parsed.permissionIds) {
    if (!existingMap.has(permId)) {
      const { error } = await supabase.schema("hrms").from("role_permissions").insert({
        role_id: parsed.roleId,
        permission_id: permId,
        status: "active",
        created_by: profile.userId,
        updated_by: profile.userId,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .schema("hrms")
        .from("role_permissions")
        .update({ status: "active", deleted_at: null, ...auditFields(profile) })
        .eq("id", existingMap.get(permId)!);
      if (error) throw new Error(error.message);
    }
  }

  for (const [permId, rowId] of existingMap) {
    if (!targetSet.has(permId)) {
      const { error } = await supabase
        .schema("hrms")
        .from("role_permissions")
        .update({ deleted_at: new Date().toISOString(), status: "inactive", ...auditFields(profile) })
        .eq("id", rowId);
      if (error) throw new Error(error.message);
    }
  }

  if (role.code === "super_admin") {
    const detail = await getRolePermissionDetail(supabase, orgId, parsed.roleId);
    const hasAnyAdminPerm = detail.effectivePermissionIds.length > 0;
    if (!hasAnyAdminPerm) {
      throw new Error("Super Admin must retain at least one permission");
    }
  }
}

export async function assignUserRole(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: z.infer<typeof assignUserRoleSchema>,
) {
  const parsed = assignUserRoleSchema.parse(input);
  const orgId = profile.employee.organizationId;

  const { data: employee } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, user_id")
    .eq("id", parsed.employeeId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!employee?.user_id) throw new Error("Employee does not have a linked user account");

  const { data: role } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, code")
    .eq("id", parsed.roleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!role) throw new Error("Role not found");

  if (role.code === "super_admin") {
    if (!isSuperAdmin(profile)) {
      throw new Error("Only Super Admin can assign the Super Admin role");
    }
    await assertSuperAdminRemains(supabase, orgId, null);
  }

  const { data: existing } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id")
    .eq("user_id", employee.user_id)
    .eq("role_id", parsed.roleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .schema("hrms")
      .from("user_roles")
      .update({ status: "active", employee_id: employee.id, ...auditFields(profile) })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    await syncUserAuthRoleMetadata(employee.user_id, orgId, role.code);
    return existing.id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .insert({
      user_id: employee.user_id,
      role_id: parsed.roleId,
      organization_id: orgId,
      employee_id: employee.id,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await syncUserAuthRoleMetadata(employee.user_id, orgId, role.code);
  return data.id;
}

export async function changeUserRole(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  userRoleId: string,
  newRoleId: string,
) {
  const orgId = profile.employee.organizationId;

  const { data: assignment } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id, user_id, employee_id, role_id, roles:role_id (code, name, portal_route)")
    .eq("id", userRoleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!assignment) throw new Error("Assignment not found");

  const oldRole = assignment.roles as
    | { code: string; name: string; portal_route: string | null }
    | { code: string; name: string; portal_route: string | null }[]
    | null;
  const oldRoleRow = Array.isArray(oldRole) ? oldRole[0] : oldRole;
  const oldCode = oldRoleRow?.code;

  const { data: newRole } = await supabase
    .schema("hrms")
    .from("roles")
    .select("code, name, portal_route")
    .eq("id", newRoleId)
    .maybeSingle();

  if (newRole?.code === "super_admin" && oldCode !== "super_admin") {
    if (!isSuperAdmin(profile)) {
      throw new Error("Only Super Admin can assign the Super Admin role");
    }
  }

  if (oldCode === "super_admin" && newRole?.code !== "super_admin") {
    await assertSuperAdminRemains(supabase, orgId, assignment.user_id);
  }

  const { error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .update({ role_id: newRoleId, ...auditFields(profile) })
    .eq("id", userRoleId);

  if (error) throw new Error(error.message);

  if (assignment.employee_id) {
    await supabase
      .schema("hrms")
      .from("employees")
      .update({
        invited_role_id: newRoleId,
        updated_by: profile.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.employee_id);
  }

  await writeApplicationAudit(supabase, {
    organizationId: orgId,
    module: "security",
    action: "role_changed",
    description: `Role changed from ${oldRoleRow?.name ?? oldCode ?? "unknown"} to ${newRole?.name ?? newRole?.code ?? "unknown"}`,
    recordId: userRoleId,
    priority: "high",
    metadata: {
      userId: assignment.user_id,
      employeeId: assignment.employee_id,
      oldRoleCode: oldCode,
      newRoleCode: newRole?.code,
      oldPortalRoute: oldRoleRow?.portal_route,
      newPortalRoute: newRole?.portal_route,
    },
  });

  if (oldRoleRow?.portal_route !== newRole?.portal_route) {
    await writeApplicationAudit(supabase, {
      organizationId: orgId,
      module: "security",
      action: "portal_changed",
      description: `Portal route changed to ${newRole?.portal_route ?? "default"} for user ${assignment.user_id}`,
      recordId: userRoleId,
      priority: "high",
      metadata: {
        userId: assignment.user_id,
        employeeId: assignment.employee_id,
        portalRoute: newRole?.portal_route,
      },
    });
  }

  if (newRole?.code) {
    await syncUserAuthRoleMetadata(assignment.user_id, orgId, newRole.code);
  }
}

export async function removeUserRole(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  userRoleId: string,
) {
  const orgId = profile.employee.organizationId;

  const { data: assignment } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id, user_id, roles:role_id (code)")
    .eq("id", userRoleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!assignment) throw new Error("Assignment not found");

  const role = assignment.roles as { code: string } | { code: string }[] | null;
  const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;

  if (roleCode === "super_admin") {
    await assertSuperAdminRemains(supabase, orgId, assignment.user_id);
  }

  const { error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .update({ deleted_at: new Date().toISOString(), status: "inactive", ...auditFields(profile) })
    .eq("id", userRoleId);

  if (error) throw new Error(error.message);
}

async function assertSuperAdminRemains(
  supabase: AuthSupabaseClient,
  organizationId: string,
  excludeUserId: string | null,
) {
  const { data: superAdminRole } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("code", "super_admin")
    .is("deleted_at", null)
    .maybeSingle();

  if (!superAdminRole) return;

  let query = supabase
    .schema("hrms")
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role_id", superAdminRole.id)
    .is("deleted_at", null)
    .eq("status", "active");

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId);
  }

  const { count } = await query;
  if ((count ?? 0) < 1) {
    throw new Error("At least one Super Admin must remain in the organization");
  }
}

export async function cloneRole(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  roleId: string,
) {
  const orgId = profile.employee.organizationId;

  const { data: source } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, name, code, description, parent_role_id, is_default, status")
    .eq("id", roleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!source) throw new Error("Role not found");

  const suffix = Date.now().toString(36);
  const newCode = `${source.code}_copy_${suffix}`.slice(0, 64);
  const newName = `${source.name} (Copy)`;

  const { data: created, error: createError } = await supabase
    .schema("hrms")
    .from("roles")
    .insert({
      organization_id: orgId,
      name: newName,
      code: newCode,
      description: source.description,
      parent_role_id: source.parent_role_id,
      is_default: false,
      is_system_role: false,
      status: source.status,
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (createError) throw new Error(createError.message);

  const { data: permissions } = await supabase
    .schema("hrms")
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (permissions?.length) {
    const { error: permError } = await supabase.schema("hrms").from("role_permissions").insert(
      permissions.map((row) => ({
        role_id: created.id,
        permission_id: row.permission_id,
        status: "active",
        created_by: profile.userId,
        updated_by: profile.userId,
      })),
    );
    if (permError) throw new Error(permError.message);
  }

  return created.id;
}

export async function changeEmployeeRole(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  newRoleId: string,
) {
  const orgId = profile.employee.organizationId;

  const { data: employee } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, user_id")
    .eq("id", employeeId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!employee?.user_id) {
    throw new Error("Employee does not have an active user account");
  }

  const { data: assignments } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id, role_id")
    .eq("user_id", employee.user_id)
    .eq("organization_id", orgId)
    .eq("status", "active")
    .is("deleted_at", null);

  const activeAssignment = assignments?.[0];

  if (activeAssignment) {
    if (activeAssignment.role_id === newRoleId) {
      return activeAssignment.id;
    }
    await changeUserRole(supabase, profile, activeAssignment.id, newRoleId);
    return activeAssignment.id;
  }

  return assignUserRole(supabase, profile, { employeeId, roleId: newRoleId });
}
