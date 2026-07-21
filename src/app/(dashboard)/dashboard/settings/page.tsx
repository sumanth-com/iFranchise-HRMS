import { EmployeeSettingsView } from "@/components/employee/settings/employee-settings-view";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { PageScroll } from "@/components/common/sticky-layout";
import { getEmployeeSelfProfileSettings } from "@/lib/employee/services/employee-self-profile";
import { EMPLOYEE_STORAGE_BUCKETS } from "@/lib/employees/constants";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import { getNotificationUserPreferences } from "@/lib/notifications/services/notification-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsSelfServicePage() {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();

  const [profileSettings, notificationPreferences] = await Promise.all([
    profile.employee?.id
      ? getEmployeeSelfProfileSettings(supabase, profile)
      : Promise.resolve(null),
    getNotificationUserPreferences(supabase, profile),
  ]);

  let profileImageUrl: string | null = null;
  if (profileSettings?.profileImageStoragePath) {
    profileImageUrl = await createSignedStorageUrl(
      supabase,
      EMPLOYEE_STORAGE_BUCKETS.profileImages,
      profileSettings.profileImageStoragePath,
    );
  }

  return (
    <PageScroll>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile, appearance, notifications, and account security.
          </p>
        </div>

        <EmployeeSettingsView
          email={profileSettings?.email ?? profile.email}
          profileSettings={profileSettings}
          profileImageUrl={profileImageUrl}
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
