import { EmployeeSettingsView } from "@/components/employee/settings/employee-settings-view";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { SettingsResignationLinkSection } from "@/components/settings/settings-resignation-link-section";
import { SettingsResignationModalSection } from "@/components/settings/settings-resignation-modal-section";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { safeServerCall } from "@/lib/errors/safe-server";
import { getExitSettings, mergeExitSettings } from "@/lib/exit/services/exit-settings";
import { getEmployeeResignationSnapshot } from "@/lib/exit/services/exit-queries";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { DEFAULT_NOTIFICATION_SOUND } from "@/lib/notifications/constants";
import { getNotificationUserPreferences } from "@/lib/notifications/services/notification-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerSettingsPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  const [notificationPreferences, snapshot, exitSettings] = await Promise.all([
    safeServerCall(
      () => getNotificationUserPreferences(supabase, profile),
      {
        id: null,
        receiveEmail: true,
        receiveInApp: true,
        muteNotifications: false,
        notificationSound: DEFAULT_NOTIFICATION_SOUND,
        dailyDigest: false,
        weeklyDigest: false,
      },
      "manager-settings.notifications",
    ),
    safeServerCall(
      () => getEmployeeResignationSnapshot(supabase, profile),
      { activeResignation: null, history: [] },
      "manager-settings.resignation",
    ),
    safeServerCall(
      () => getExitSettings(supabase, profile.employee.organizationId),
      mergeExitSettings(null),
      "manager-settings.exit",
    ),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage appearance, notifications, and account security. Personal profile is under My
            Profile in the sidebar.
          </p>
        </div>

        <EmployeeSettingsView
          email={profile.email}
          accountBeside={
            <SettingsResignationModalSection
              title="Resignation"
              description="Submit your resignation and track approval status."
              canApply={hasPermission(profile.permissionCodes, "exit.create")}
              employeeId={profile.employee.id}
              defaultNoticePeriodDays={exitSettings.defaultNoticePeriodDays}
              activeResignation={snapshot.activeResignation}
              className="h-full"
            />
          }
        />

        <SettingsResignationLinkSection
          href={MANAGER_ROUTES.resignation}
          title="Team Resignations"
          description="Review and approve resignation requests from your team."
        />

        <section
          id="notifications"
          className="rounded-xl border bg-card p-4 shadow-sm md:p-5"
        >
          <div className="mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Notifications</h2>
            <p className="text-xs text-muted-foreground">
              Choose your notification sound, delivery channels, and digest options.
            </p>
          </div>
          <NotificationPreferencesForm preferences={notificationPreferences} />
        </section>
      </div>
    </div>
  );
}
