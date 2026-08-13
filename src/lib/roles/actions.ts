"use server";

import { revalidatePath } from "next/cache";

import { ROLES_ROUTES, SYSTEM_ROLES_ROUTES } from "@/lib/roles/constants";
import {
  assignUserRole,
  changeEmployeeRole,
  changeUserRole,
  cloneRole,
  deleteRole,
  removeUserRole,
  saveRole,
  saveRolePermissions,
} from "@/lib/roles/services/role-mutations";
import {
  compareRoles,
  getAllPermissions,
  getRoleAccessDetail,
  getRoleAccessPreview,
  getRolePermissionDetail,
  listAllRolesForExport,
  listUserRoleAssignments,
  searchRolesModule,
} from "@/lib/roles/services/role-queries";
import { exportRolesPayload, exportUserRolesPayload } from "@/lib/roles/services/role-export";
import type { RoleExportPayload } from "@/lib/roles/services/role-export";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  assignUserRoleSchema,
  removeUserRoleSchema,
  roleCompareSchema,
  roleFormSchema,
  rolePermissionsSchema,
  roleSearchSchema,
} from "@/lib/validations/roles";
import type { RoleActionResult, RoleExportFormat } from "@/types/roles";

function revalidateRoles() {
  for (const route of Object.values(ROLES_ROUTES)) {
    revalidatePath(route);
  }
  for (const route of Object.values(SYSTEM_ROLES_ROUTES)) {
    revalidatePath(route);
  }
}

export async function saveRoleAction(
  input: unknown,
  id?: string,
): Promise<RoleActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(
      id ? ["role.edit", "role.manage"] : ["role.create", "role.manage"],
    );
    const supabase = await createClient();
    const parsed = roleFormSchema.parse(input);
    const resultId = await saveRole(supabase, profile, parsed, id);
    revalidateRoles();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save role",
    };
  }
}

export async function deleteRoleAction(id: string): Promise<RoleActionResult> {
  try {
    const profile = await requireServerAnyPermission(["role.delete", "role.manage"]);
    const supabase = await createClient();
    await deleteRole(supabase, profile, id);
    revalidateRoles();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete role",
    };
  }
}

export async function saveRolePermissionsAction(
  input: unknown,
): Promise<RoleActionResult> {
  try {
    const profile = await requireServerAnyPermission(["permission.assign", "role.manage"]);
    const supabase = await createClient();
    const parsed = rolePermissionsSchema.parse(input);
    await saveRolePermissions(supabase, profile, parsed);
    revalidateRoles();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save permissions",
    };
  }
}

export async function assignUserRoleAction(
  input: unknown,
): Promise<RoleActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission([
      "permission.assign",
      "user_role.assign",
      "role.manage",
    ]);
    const supabase = await createClient();
    const parsed = assignUserRoleSchema.parse(input);
    const id = await assignUserRole(supabase, profile, parsed);
    revalidateRoles();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to assign role",
    };
  }
}

export async function changeUserRoleAction(
  userRoleId: string,
  newRoleId: string,
): Promise<RoleActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "permission.assign",
      "user_role.assign",
      "role.manage",
    ]);
    const supabase = await createClient();
    await changeUserRole(supabase, profile, userRoleId, newRoleId);
    revalidateRoles();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to change role",
    };
  }
}

export async function removeUserRoleAction(
  userRoleId: string,
): Promise<RoleActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "permission.assign",
      "user_role.assign",
      "role.manage",
    ]);
    const supabase = await createClient();
    removeUserRoleSchema.parse({ userRoleId });
    await removeUserRole(supabase, profile, userRoleId);
    revalidateRoles();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to remove role",
    };
  }
}

export async function changeEmployeeRoleAction(
  employeeId: string,
  newRoleId: string,
): Promise<RoleActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "permission.assign",
      "user_role.assign",
      "role.manage",
    ]);
    const supabase = await createClient();
    await changeEmployeeRole(supabase, profile, employeeId, newRoleId);
    revalidateRoles();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to change employee role",
    };
  }
}

export async function cloneRoleAction(roleId: string): Promise<RoleActionResult<string>> {
  try {
    const profile = await requireServerAnyPermission(["role.create", "role.manage"]);
    const supabase = await createClient();
    const id = await cloneRole(supabase, profile, roleId);
    revalidateRoles();
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to clone role",
    };
  }
}

export async function compareRolesAction(
  input: unknown,
): Promise<RoleActionResult<Awaited<ReturnType<typeof compareRoles>>>> {
  try {
    const profile = await requireServerAnyPermission(["role.view"]);
    const supabase = await createClient();
    const parsed = roleCompareSchema.parse(input);
    const data = await compareRoles(
      supabase,
      profile.employee.organizationId,
      parsed.roleAId,
      parsed.roleBId,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Comparison failed",
    };
  }
}

export async function searchRolesAction(
  query: string,
): Promise<RoleActionResult<Awaited<ReturnType<typeof searchRolesModule>>>> {
  try {
    const profile = await requireServerAnyPermission(["role.view"]);
    const supabase = await createClient();
    const parsed = roleSearchSchema.parse({ query });
    const data = await searchRolesModule(
      supabase,
      profile.employee.organizationId,
      parsed.query,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Search failed",
    };
  }
}

export async function exportRolesDataAction(
  entity: "roles" | "assignments",
  format: RoleExportFormat,
): Promise<RoleActionResult<RoleExportPayload>> {
  try {
    if (format !== "csv" && format !== "excel") {
      return { success: false, message: "Unsupported export format" };
    }

    const profile = await requireServerAnyPermission(["role.view"]);
    const supabase = await createClient();
    const orgId = profile.employee.organizationId;
    const stamp = new Date().toISOString().slice(0, 10);

    if (entity === "roles") {
      const roles = await listAllRolesForExport(supabase, orgId);
      return { success: true, data: exportRolesPayload(roles, format, stamp) };
    }

    const first = await listUserRoleAssignments(supabase, orgId, {
      page: 1,
      pageSize: 100,
    });
    const assignments = [...first.data];
    const totalPages = Math.max(1, Math.ceil(first.total / 100));
    for (let page = 2; page <= totalPages; page += 1) {
      const next = await listUserRoleAssignments(supabase, orgId, {
        page,
        pageSize: 100,
      });
      assignments.push(...next.data);
    }

    return {
      success: true,
      data: exportUserRolesPayload(assignments, format, stamp),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Export failed",
    };
  }
}

export async function fetchRolePermissionDetailAction(roleId: string) {
  try {
    const profile = await requireServerAnyPermission(["role.view", "permission.view"]);
    const supabase = await createClient();
    const [detail, permissions] = await Promise.all([
      getRolePermissionDetail(supabase, profile.employee.organizationId, roleId),
      getAllPermissions(supabase),
    ]);
    return { success: true as const, data: { detail, permissions } };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load permissions",
    };
  }
}

export async function fetchRoleAccessDetailAction(roleId: string) {
  try {
    const profile = await requireServerAnyPermission(["role.view", "permission.view", "user_role.view"]);
    const supabase = await createClient();
    const data = await getRoleAccessDetail(supabase, profile.employee.organizationId, roleId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load role details",
    };
  }
}

export async function fetchRoleAccessPreviewAction(roleId: string) {
  try {
    const profile = await requireServerAnyPermission(["role.view", "permission.view"]);
    const supabase = await createClient();
    const data = await getRoleAccessPreview(supabase, profile.employee.organizationId, roleId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load access preview",
    };
  }
}
