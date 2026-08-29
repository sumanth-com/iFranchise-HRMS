import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { syncUserAuthRoleMetadata } from "@/lib/auth/sync-user-auth-role";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import type { UserProfile } from "@/types/auth";
import type { z } from "zod";
import {
  assignUserRoleSchema,
  roleFormSchema,
  rolePermissionsSchema,
  slugifyRoleCode,
} from "@/lib/validations/roles";
import {
  getRoleAncestorIds,
  getRolePermissionIds,
} from "@/lib/roles/services/role-queries";
import { canDeleteRoleRecord } from "@/lib/roles/protected-roles";
import { SYSTEM_ADMIN_PERMISSION } from "@/lib/system-admin/constants";
import { isSuperAdmin } from "@/lib/system-admin/is-super-admin";

type RoleInput = z.infer<typeof roleFormSchema>;

function auditFields(profile: UserProfile) {
  return { updated_by: profile.userId, updated_at: new Date().toISOString() };
}

async function writeRolesAudit(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    action: string;
    description: string;
    recordId: string;
    metadata?: Record<string, unknown>;
    priority?: "low" | "medium" | "high" | "critical";
  },
) {
  const ctx = await getRequestAuditContext();
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "roles",
    action: input.action,
    description: input.description,
    recordId: input.recordId,
    priority: input.priority ?? "high",
    metadata: input.metadata ?? {},
    ...ctx,
  });
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

  let code = (parsed.code?.trim() || slugifyRoleCode(parsed.name)).toLowerCase();

  if (!id) {
    // Ensure unique code when auto-generating from name.
    let attempt = code;
    let suffix = 1;
    while (true) {
      try {
        await assertUniqueRoleCode(supabase, orgId, attempt);
        code = attempt;
        break;
      } catch {
        attempt = `${code.slice(0, 40)}_${suffix}`;
        suffix += 1;
        if (suffix > 50) throw new Error("Could not generate a unique role code");
      }
    }
  } else if (parsed.code?.trim()) {
    await assertUniqueRoleCode(supabase, orgId, code, id);
  }

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
    code,
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
      .select(
        "id, name, code, description, is_system_role, parent_role_id, is_default, status",
      )
      .eq("id", id)
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!existing) throw new Error("Role not found");

    if (existing.is_system_role) {
      if (parsed.status !== existing.status) {
        throw new Error("System roles cannot be enabled or disabled");
      }
      if ((parsed.parentRoleId ?? null) !== existing.parent_role_id) {
        throw new Error("System role inheritance cannot be changed");
      }
      if (parsed.isDefault !== Boolean(existing.is_default)) {
        throw new Error("System role default flag cannot be changed");
      }

      const { error } = await supabase
        .schema("hrms")
        .from("roles")
        .update({
          name: payload.name,
          description: payload.description,
          ...auditFields(profile),
        })
        .eq("id", id)
        .eq("organization_id", orgId);
      if (error) throw new Error(error.message);

      await writeRolesAudit(supabase, profile, {
        action: "role_edited",
        description: `System role “${existing.name}” details updated`,
        recordId: id,
        metadata: {
          roleId: id,
          roleCode: existing.code,
          old: { name: existing.name, description: existing.description },
          new: { name: payload.name, description: payload.description },
        },
      });
      return id;
    }

    const updatePayload = parsed.code?.trim()
      ? payload
      : {
          name: payload.name,
          description: payload.description,
          parent_role_id: payload.parent_role_id,
          is_default: payload.is_default,
          status: payload.status,
          ...auditFields(profile),
        };

    const { error } = await supabase
      .schema("hrms")
      .from("roles")
      .update(updatePayload)
      .eq("id", id)
      .eq("organization_id", orgId);
    if (error) throw new Error(error.message);

    await writeRolesAudit(supabase, profile, {
      action: existing.status !== parsed.status ? (parsed.status === "active" ? "role_enabled" : "role_disabled") : "role_edited",
      description:
        existing.status !== parsed.status
          ? `Role “${payload.name}” ${parsed.status === "active" ? "enabled" : "disabled"}`
          : `Role “${payload.name}” updated`,
      recordId: id,
      metadata: {
        roleId: id,
        roleCode: existing.code,
        old: {
          name: existing.name,
          description: existing.description,
          status: existing.status,
          parentRoleId: existing.parent_role_id,
        },
        new: {
          name: payload.name,
          description: payload.description,
          status: payload.status,
          parentRoleId: payload.parent_role_id,
        },
      },
    });
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

  await writeRolesAudit(supabase, profile, {
    action: "role_created",
    description: `Custom role “${parsed.name}” created`,
    recordId: data.id,
    metadata: {
      roleId: data.id,
      roleCode: code,
      name: parsed.name,
      status: parsed.status,
      parentRoleId: parsed.parentRoleId ?? null,
    },
  });

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
    .select("is_system_role, code, name")
    .eq("id", roleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!role) throw new Error("Role not found");

  if (!canDeleteRoleRecord({ isSystemRole: role.is_system_role, code: role.code })) {
    throw new Error("Cannot delete the Super Admin role");
  }

  // App-layer auth already checked role.delete / role.manage.
  // Soft-delete assignments + role with service role so RLS on user_roles
  // (which requires user_role.assign) does not block role cleanup.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const audit = {
    updated_by: profile.userId,
    updated_at: now,
  };

  const { data: assignments, error: assignmentFetchError } = await admin
    .schema("hrms")
    .from("user_roles")
    .select("id, user_id")
    .eq("organization_id", orgId)
    .eq("role_id", roleId)
    .is("deleted_at", null);

  if (assignmentFetchError) throw new Error(assignmentFetchError.message);

  if (assignments && assignments.length > 0) {
    const { error: assignmentError } = await admin
      .schema("hrms")
      .from("user_roles")
      .update({
        deleted_at: now,
        status: "inactive",
        ...audit,
      })
      .eq("organization_id", orgId)
      .eq("role_id", roleId)
      .is("deleted_at", null);

    if (assignmentError) throw new Error(assignmentError.message);

    // Best-effort: point auth metadata at another remaining role for each user.
    for (const assignment of assignments) {
      try {
        const { data: remaining } = await admin
          .schema("hrms")
          .from("user_roles")
          .select("roles:role_id (code)")
          .eq("organization_id", orgId)
          .eq("user_id", assignment.user_id)
          .is("deleted_at", null)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        const remainingRole = remaining?.roles as
          | { code: string }
          | { code: string }[]
          | null
          | undefined;
        const nextCode = Array.isArray(remainingRole)
          ? remainingRole[0]?.code
          : remainingRole?.code;

        if (nextCode) {
          await syncUserAuthRoleMetadata(assignment.user_id, orgId, nextCode);
        }
      } catch {
        // Ignore metadata sync failures; role soft-delete still proceeds.
      }
    }
  }

  const { error } = await admin
    .schema("hrms")
    .from("roles")
    .update({
      deleted_at: now,
      status: "archived",
      ...audit,
    })
    .eq("id", roleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  await writeRolesAudit(supabase, profile, {
    action: "role_deleted",
    description: `Role “${role.name}” deleted`,
    recordId: roleId,
    metadata: {
      roleId,
      roleCode: role.code,
      userCount: assignments?.length ?? 0,
    },
  });
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

  const grantedIds = parsed.permissionIds.filter((id, index, all) => all.indexOf(id) === index);

  if (grantedIds.length > 0) {
    const { data: catalog, error: catalogError } = await supabase
      .schema("hrms")
      .from("permissions")
      .select("id")
      .in("id", grantedIds)
      .is("deleted_at", null)
      .eq("status", "active");
    if (catalogError) throw new Error(catalogError.message);
    if ((catalog ?? []).length !== grantedIds.length) {
      throw new Error("One or more permissions are not valid");
    }
  }

  const ancestorIds = await getRoleAncestorIds(supabase, parsed.roleId, orgId);
  const inheritedIds = ancestorIds.length
    ? await getRolePermissionIds(supabase, ancestorIds)
    : [];

  if (role.code === "super_admin") {
    const effectiveIds = new Set([...grantedIds, ...inheritedIds]);
    if (effectiveIds.size === 0) {
      throw new Error("Super Admin must retain at least one permission");
    }

    const { data: adminPerm } = await supabase
      .schema("hrms")
      .from("permissions")
      .select("id")
      .eq("code", SYSTEM_ADMIN_PERMISSION)
      .is("deleted_at", null)
      .maybeSingle();

    if (adminPerm && !effectiveIds.has(adminPerm.id)) {
      throw new Error("Super Admin must retain system administration access");
    }
  }

  const { data: existing } = await supabase
    .schema("hrms")
    .from("role_permissions")
    .select("id, permission_id")
    .eq("role_id", parsed.roleId)
    .is("deleted_at", null);

  const existingMap = new Map((existing ?? []).map((r) => [r.permission_id, r.id]));
  const targetSet = new Set(grantedIds);
  const granted: string[] = [];
  const revoked: string[] = [];

  for (const permId of grantedIds) {
    if (!existingMap.has(permId)) {
      const { error } = await supabase.schema("hrms").from("role_permissions").insert({
        role_id: parsed.roleId,
        permission_id: permId,
        status: "active",
        created_by: profile.userId,
        updated_by: profile.userId,
      });
      if (error) throw new Error(error.message);
      granted.push(permId);
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
      revoked.push(permId);
    }
  }

  if (granted.length > 0 || revoked.length > 0) {
    await writeRolesAudit(supabase, profile, {
      action: "permissions_updated",
      description: `Permissions updated for role ${role.code}`,
      recordId: parsed.roleId,
      metadata: {
        roleId: parsed.roleId,
        roleCode: role.code,
        granted,
        revoked,
      },
    });
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
    .select("id, code, name, status, portal_key, portal_route")
    .eq("id", parsed.roleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!role) throw new Error("Role not found");
  if (role.status !== "active") {
    throw new Error("Cannot assign a disabled role");
  }

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
    await writeRolesAudit(supabase, profile, {
      action: "user_role_assigned",
      description: `Assigned “${role.name}” to user ${employee.user_id}`,
      recordId: existing.id,
      metadata: {
        roleId: role.id,
        roleCode: role.code,
        userId: employee.user_id,
        employeeId: employee.id,
        portalKey: role.portal_key,
        portalRoute: role.portal_route,
      },
    });
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
  await writeRolesAudit(supabase, profile, {
    action: "user_role_assigned",
    description: `Assigned “${role.name}” to user ${employee.user_id}`,
    recordId: data.id,
    metadata: {
      roleId: role.id,
      roleCode: role.code,
      userId: employee.user_id,
      employeeId: employee.id,
      portalKey: role.portal_key,
      portalRoute: role.portal_route,
    },
  });
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
    .select("id, code, name, portal_route, portal_key, status, is_system_role")
    .eq("id", newRoleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!newRole) throw new Error("Role not found");
  if (newRole.status !== "active") {
    throw new Error("Cannot assign a disabled role");
  }

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

  // Remove any other active role rows so portal access matches the new role only.
  const now = new Date().toISOString();
  await supabase
    .schema("hrms")
    .from("user_roles")
    .update({
      status: "inactive",
      deleted_at: now,
      updated_by: profile.userId,
      updated_at: now,
    })
    .eq("organization_id", orgId)
    .eq("user_id", assignment.user_id)
    .neq("id", userRoleId)
    .is("deleted_at", null);

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

  await writeRolesAudit(supabase, profile, {
    action: "user_role_changed",
    description: `Role changed from ${oldRoleRow?.name ?? oldCode ?? "unknown"} to ${newRole.name}`,
    recordId: userRoleId,
    metadata: {
      roleId: newRole.id,
      userId: assignment.user_id,
      employeeId: assignment.employee_id,
      oldRoleCode: oldCode,
      newRoleCode: newRole.code,
      oldPortalRoute: oldRoleRow?.portal_route,
      newPortalRoute: newRole.portal_route,
    },
  });

  if (oldRoleRow?.portal_route !== newRole.portal_route) {
    await writeRolesAudit(supabase, profile, {
      action: "portal_changed",
      description: `Portal route changed to ${newRole.portal_route ?? "default"} for user ${assignment.user_id}`,
      recordId: userRoleId,
      metadata: {
        roleId: newRole.id,
        userId: assignment.user_id,
        employeeId: assignment.employee_id,
        portalRoute: newRole.portal_route,
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
    .select("id, user_id, employee_id, role_id, roles:role_id (id, code, name, is_system_role)")
    .eq("id", userRoleId)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!assignment) throw new Error("Assignment not found");

  const role = assignment.roles as
    | { id: string; code: string; name: string; is_system_role: boolean }
    | { id: string; code: string; name: string; is_system_role: boolean }[]
    | null;
  const roleRow = Array.isArray(role) ? role[0] : role;
  const roleCode = roleRow?.code;

  if (roleRow?.is_system_role || roleCode === "super_admin") {
    throw new Error("System role assignments cannot be removed. Change the role instead.");
  }

  if (roleCode === "super_admin") {
    await assertSuperAdminRemains(supabase, orgId, assignment.user_id);
  }

  const { count: remainingCount } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("user_id", assignment.user_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .neq("id", userRoleId);

  if ((remainingCount ?? 0) < 1) {
    throw new Error("Assign another role before removing this one so the user is not locked out");
  }

  const { error } = await supabase
    .schema("hrms")
    .from("user_roles")
    .update({ deleted_at: new Date().toISOString(), status: "inactive", ...auditFields(profile) })
    .eq("id", userRoleId);

  if (error) throw new Error(error.message);

  await writeRolesAudit(supabase, profile, {
    action: "user_role_removed",
    description: `Removed “${roleRow?.name ?? roleCode ?? "role"}” from user ${assignment.user_id}`,
    recordId: userRoleId,
    metadata: {
      roleId: roleRow?.id ?? assignment.role_id,
      roleCode,
      userId: assignment.user_id,
      employeeId: assignment.employee_id,
    },
  });
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
    .select("id, name, code, description, parent_role_id, is_default, status, portal_key, portal_route")
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
      status: "active",
      portal_key: source.portal_key,
      portal_route: source.portal_route,
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

  await writeRolesAudit(supabase, profile, {
    action: "role_created",
    description: `Role “${source.name}” duplicated as “${newName}”`,
    recordId: created.id,
    metadata: {
      roleId: created.id,
      roleCode: newCode,
      sourceRoleId: source.id,
      sourceRoleCode: source.code,
    },
  });

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
