import { PortalHelpView } from "@/components/layout/portal-help-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function CeoHelpPage() {
  const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.ceo]);
  return <PortalHelpView firstName={profile.employee.firstName} variant="ceo" />;
}
