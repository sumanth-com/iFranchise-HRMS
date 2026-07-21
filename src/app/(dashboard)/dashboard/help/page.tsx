import { PortalHelpView } from "@/components/layout/portal-help-view";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";

export default async function DashboardHelpPage() {
  const profile = await requireAuthenticatedProfile();
  return <PortalHelpView firstName={profile.employee.firstName} variant="hr" />;
}
