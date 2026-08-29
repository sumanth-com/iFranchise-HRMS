import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { PortalKey } from "@/lib/auth/portals";
import { derivePortalFromRoleCode } from "@/lib/user-provisioning/provisionable-roles";
import { PORTAL_ROUTES } from "@/lib/auth/portals";

export type InviteableRole = {
  id: string;
  code: string;
  name: string;
  portalKey: PortalKey | null;
  portalRoute: string | null;
  portalLabel: string;
};

const PORTAL_LABELS: Record<PortalKey, string> = {
  hr: "HR Portal",
  ceo: "Executive Portal",
  manager: "Manager Portal",
  employee: "Employee Portal",
};

function normalizePortalKey(value: string | null | undefined): PortalKey | null {
  if (value === "hr" || value === "ceo" || value === "manager" || value === "employee") {
    return value;
  }
  return null;
}

function mapActiveRoleRow(row: {
  id: unknown;
  code: unknown;
  name: unknown;
  portal_key?: unknown;
  portal_route?: unknown;
}): InviteableRole {
  const code = String(row.code ?? "");
  const portalKey =
    normalizePortalKey(row.portal_key as string | null) ?? derivePortalFromRoleCode(code);
  return {
    id: String(row.id),
    code,
    name: String(row.name ?? code),
    portalKey,
    portalRoute:
      row.portal_route != null
        ? String(row.portal_route)
        : portalKey
          ? PORTAL_ROUTES[portalKey]
          : null,
    portalLabel: portalKey ? PORTAL_LABELS[portalKey] : "—",
  };
}

/**
 * Roles shown in invite pickers. Excludes super_admin so it cannot be selected
 * when creating a new invitation from User Provisioning.
 */
export async function loadInviteableRoles(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<InviteableRole[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, code, name, portal_key, portal_route, is_inviteable, status")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => {
      const code = String(row.code ?? "").toLowerCase();
      if (code === "super_admin") return false;
      if (row.is_inviteable === true) return true;
      return code !== "super_admin";
    })
    .map((row) => mapActiveRoleRow(row));
}

/**
 * Resolve an already-assigned invitation / portal role by ID.
 * Source of truth for pending accounts is employees.invited_role_id — including
 * super_admin. Does not require an active user_roles row.
 */
export async function getOrganizationActiveRoleById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleId: string,
): Promise<InviteableRole> {
  const normalizedId = roleId.trim();
  if (!normalizedId) {
    throw new Error("We couldn't apply that role right now. Please try again.");
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, code, name, portal_key, portal_route, status")
    .eq("organization_id", organizationId)
    .eq("id", normalizedId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[iam-roles] failed to resolve organization role by id", {
      organizationId,
      roleId: normalizedId,
      error: error.message,
    });
    throw new Error("We couldn't apply that role right now. Please try again.");
  }

  if (!data) {
    throw new Error("We couldn't apply that role right now. Please try again.");
  }

  return mapActiveRoleRow(data);
}

/**
 * Resolve the role for an invitation by ID.
 * Uses the organization's active role catalog (including super_admin) so pending
 * invites with invited_role_id can be resent/activated without requiring an
 * active user_roles row or appearing in the invite picker.
 */
export async function getInviteableRoleById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleId: string,
): Promise<InviteableRole> {
  return getOrganizationActiveRoleById(supabase, organizationId, roleId);
}

/**
 * Resolve an inviteable picker role by code (excludes super_admin).
 * Use for new invitations from the User Provisioning role list only.
 */
export async function getInviteableRoleByCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleCode: string,
): Promise<InviteableRole> {
  const roles = await loadInviteableRoles(supabase, organizationId);
  const match = roles.find((role) => role.code.toLowerCase() === roleCode.toLowerCase());
  if (!match) {
    throw new Error("Select a valid active role from Roles & Permissions.");
  }
  return match;
}

export async function ensureRolePortalMetadata(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleCode: string,
): Promise<void> {
  const portalKey = derivePortalFromRoleCode(roleCode);
  if (!portalKey) return;

  const portalRoute = PORTAL_ROUTES[portalKey];
  await supabase
    .schema("hrms")
    .from("roles")
    .update({
      portal_key: portalKey,
      portal_route: portalRoute,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("code", roleCode)
    .is("deleted_at", null);
}
