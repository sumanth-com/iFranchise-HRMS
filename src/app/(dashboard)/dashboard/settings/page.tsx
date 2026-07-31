import { EmployeeSettingsView } from "@/components/employee/settings/employee-settings-view";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { PageScroll } from "@/components/common/sticky-layout";
import { SettingsResignationLinkSection } from "@/components/settings/settings-resignation-link-section";
import { EXIT_ROUTES } from "@/lib/exit/constants";
import { getNotificationUserPreferences } from "@/lib/notifications/services/notification-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsSelfServicePage() {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const notificationPreferences = await getNotificationUserPreferences(supabase, profile);

  return (
    <PageScroll>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage appearance, notifications, and account security. Personal profile is under My Profile in the sidebar.
          </p>
        </div>

        <EmployeeSettingsView email={profile.email} />

        <SettingsResignationLinkSection
          href={EXIT_ROUTES.dashboard}
          title="Offboarding"
          description="Manage resignations, clearance, settlements, and exit documentation."
        />

        <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Notifications</h2>
            <p className="text-xs text-muted-foreground">
              Choose your notification sound, delivery channels, and digest options.
            </p>
          </div>
          <NotificationPreferencesForm preferences={notificationPreferences} />
        </section>
      </div>
    </PageScroll>
  );
}
