import { ModuleShell } from "@/components/common/sticky-layout";
import { NotificationsSubNav } from "@/components/notifications/notifications-sub-nav";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAuthenticatedProfile();

  return (
    <ModuleShell header={<NotificationsSubNav permissionCodes={profile.permissionCodes} />}>
      {children}
    </ModuleShell>
  );
}
