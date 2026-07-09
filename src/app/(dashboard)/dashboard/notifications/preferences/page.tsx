import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { getNotificationUserPreferences } from "@/lib/notifications/services/notification-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationPreferencesPage() {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const preferences = await getNotificationUserPreferences(supabase, profile);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how you receive notifications across channels.
        </p>
      </div>
      <NotificationPreferencesForm preferences={preferences} />
    </div>
  );
}
