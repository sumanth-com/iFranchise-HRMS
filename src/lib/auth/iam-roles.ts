import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { PortalKey } from "@/lib/auth/portals";

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
    .map((row) => {
      const portalKey = normalizePortalKey(row.portal_key as string | null);
      return {
        id: String(row.id),
        code: String(row.code),
        name: String(row.name),
        portalKey,
        portalRoute: row.portal_route ? String(row.portal_route) : null,
        portalLabel: portalKey ? PORTAL_LABELS[portalKey] : "—",
      };
    });
}

export async function getInviteableRoleById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleId: string,
): Promise<InviteableRole> {
  const roles = await loadInviteableRoles(supabase, organizationId);
  const match = roles.find((role) => role.id === roleId);
  if (!match) {
    throw new Error("Select a valid role for this invitation.");
  }
  return match;
}

export async function getInviteableRoleByCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleCode: string,
): Promise<InviteableRole> {
  const roles = await loadInviteableRoles(supabase, organizationId);
  const match = roles.find((role) => role.code.toLowerCase() === roleCode.toLowerCase());
  if (!match) {
    throw new Error(`Role "${roleCode}" is not available for invitation.`);
  }
  return match;
}
