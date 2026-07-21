import { PortalHelpView } from "@/components/layout/portal-help-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function ManagerHelpPage() {
  const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.manager]);
  return <PortalHelpView firstName={profile.employee.firstName} variant="manager" />;
}
