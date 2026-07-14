"use server";

import { revalidatePath } from "next/cache";

import { NOTIFICATIONS_ROUTES } from "@/lib/notifications/constants";
import {
  archiveNotification,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  previewNotificationTemplate,
  saveNotificationSettings,
  saveNotificationTemplate,
  saveNotificationUserPreferences,
} from "@/lib/notifications/services/notification-mutations";
import {
  getNotificationBellData,
  listNotificationHistory,
  listNotifications,
} from "@/lib/notifications/services/notification-queries";
import {
  requireAuthenticatedProfile,
  requireServerAnyPermission,
} from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  notificationHistoryParamsSchema,
  notificationListParamsSchema,
  notificationPreferencesFormSchema,
  notificationPreviewSchema,
  notificationSettingsFormSchema,
  notificationTemplateFormSchema,
} from "@/lib/validations/notifications";
import type { NotificationActionResult } from "@/types/notifications";
import { NOTIFICATION_MANAGE_PERMISSIONS, NOTIFICATION_SETTINGS_PERMISSIONS } from "@/lib/notifications/constants";

function revalidateNotifications() {
  for (const route of Object.values(NOTIFICATIONS_ROUTES)) {
    revalidatePath(route);
  }
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    await markNotificationRead(supabase, profile, notificationId);
    revalidateNotifications();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to mark as read",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    await markAllNotificationsRead(supabase, profile);
    revalidateNotifications();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to mark all as read",
    };
  }
}

export async function archiveNotificationAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    await archiveNotification(supabase, profile, notificationId);
    revalidateNotifications();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to archive notification",
    };
  }
}

export async function deleteNotificationAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    await deleteNotification(supabase, profile, notificationId);
    revalidateNotifications();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete notification",
    };
  }
}

export async function saveNotificationTemplateAction(
  input: unknown,
  id?: string,
): Promise<NotificationActionResult<string>> {
  try {
    await requireServerAnyPermission([...NOTIFICATION_MANAGE_PERMISSIONS]);
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const parsed = notificationTemplateFormSchema.parse(input);
    const resultId = await saveNotificationTemplate(supabase, profile, parsed, id);
    revalidateNotifications();
    return { success: true, data: resultId };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save template",
    };
  }
}

export async function saveNotificationSettingsAction(
  input: unknown,
): Promise<NotificationActionResult> {
  try {
    await requireServerAnyPermission([...NOTIFICATION_SETTINGS_PERMISSIONS]);
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const parsed = notificationSettingsFormSchema.parse(input);
    await saveNotificationSettings(supabase, profile, parsed);
    revalidateNotifications();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}

export async function saveNotificationPreferencesAction(
  input: unknown,
): Promise<NotificationActionResult> {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const parsed = notificationPreferencesFormSchema.parse(input);
    await saveNotificationUserPreferences(supabase, profile, parsed);
    revalidateNotifications();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save preferences",
    };
  }
}

export async function previewNotificationTemplateAction(input: unknown) {
  try {
    const parsed = notificationPreviewSchema.parse(input);
    return {
      success: true as const,
      data: previewNotificationTemplate(
        parsed.subject,
        parsed.bodyTemplate,
        parsed.variables,
      ),
    };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to preview template",
    };
  }
}

export async function getNotificationBellDataAction() {
  try {
    const profile = await requireAuthenticatedProfile();
    const supabase = await createClient();
    const data = await getNotificationBellData(supabase, profile);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load notifications",
      data: { unreadCount: 0, items: [], soundEnabled: false, notificationSound: "classic" },
    };
  }
}

export async function fetchNotificationsAction(input: unknown) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const parsed = notificationListParamsSchema.parse(input);
  return listNotifications(supabase, profile, parsed, "own");
}

export async function fetchNotificationHistoryAction(input: unknown) {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();
  const parsed = notificationHistoryParamsSchema.parse(input);
  return listNotificationHistory(supabase, profile, parsed);
}
