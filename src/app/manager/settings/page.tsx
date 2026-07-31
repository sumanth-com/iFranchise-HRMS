import { AccountPasswordResetSection } from "@/components/auth/account-password-reset-section";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { SettingsResignationLinkSection } from "@/components/settings/settings-resignation-link-section";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { getNotificationUserPreferences } from "@/lib/notifications/services/notification-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerSettingsPage() {
  const profile = await requireServerPermission("portal.manager.access");
  const supabase = await createClient();
  const preferences = await getNotificationUserPreferences(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your manager portal preferences, account security, and notifications. Personal
            profile is under My Profile in the sidebar.
          </p>
        </div>

        <AccountPasswordResetSection email={profile.email} />

        <SettingsResignationLinkSection
          href={MANAGER_ROUTES.resignation}
          title="Team Resignations"
          description="Review and approve resignation requests from your team."
        />

        <section id="notifications" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Notification preferences</h2>
            <p className="text-sm text-muted-foreground">
              Choose your notification sound, delivery channels, and digest options.
            </p>
          </div>
          <NotificationPreferencesForm preferences={preferences} />
        </section>
      </div>
    </div>
  );
}
