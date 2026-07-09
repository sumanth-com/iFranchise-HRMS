import { NotificationSettingsForm } from "@/components/notifications/notification-settings-form";
import {
  NOTIFICATION_SETTINGS_PERMISSIONS,
  canManageNotificationSettings,
} from "@/lib/notifications/constants";
import { getNotificationSettings } from "@/lib/notifications/services/notification-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationSettingsPage() {
  const profile = await requireServerAnyPermission([...NOTIFICATION_SETTINGS_PERMISSIONS]);
  const supabase = await createClient();
  const settings = await getNotificationSettings(supabase, profile.employee.organizationId);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notification Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure delivery channels per notification type for your organization.
        </p>
      </div>
      <NotificationSettingsForm
        settings={settings}
        canEdit={canManageNotificationSettings(profile.permissionCodes)}
      />
    </div>
  );
}
