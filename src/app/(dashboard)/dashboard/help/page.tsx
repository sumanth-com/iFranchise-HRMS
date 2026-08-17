import { DashboardPortalHelpPage } from "@/components/layout/dashboard-portal-help-page";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";

export default async function DashboardHelpPage() {
  const profile = await requireAuthenticatedProfile();
  return <DashboardPortalHelpPage firstName={profile.employee.firstName} />;
}
