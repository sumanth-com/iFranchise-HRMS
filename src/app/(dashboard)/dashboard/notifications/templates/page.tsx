import { NotificationTemplatesManagement } from "@/components/notifications/notification-templates-management";
import {
  NOTIFICATION_MANAGE_PERMISSIONS,
  canManageNotifications,
} from "@/lib/notifications/constants";
import { listNotificationTemplates } from "@/lib/notifications/services/notification-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationTemplatesPage() {
  const profile = await requireServerAnyPermission([...NOTIFICATION_MANAGE_PERMISSIONS]);
  const supabase = await createClient();
  const templates = await listNotificationTemplates(supabase, profile.employee.organizationId);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notification Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage subject, message, variables, and preview for system notification templates.
        </p>
      </div>
      <NotificationTemplatesManagement
        templates={templates}
        canEdit={canManageNotifications(profile.permissionCodes)}
      />
    </div>
  );
}
