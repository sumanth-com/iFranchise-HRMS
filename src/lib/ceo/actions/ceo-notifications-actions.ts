"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  archiveCeoNotification,
  completeCeoNotificationAfterNavigate,
  getCeoNotificationDetail,
  getCeoNotificationsPageData,
  markCeoNotificationRead,
} from "@/lib/ceo/services/ceo-notifications-queries";
import { markAllNotificationsRead } from "@/lib/notifications/services/notification-mutations";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  ceoNotificationIdSchema,
  ceoNotificationNavigateSchema,
  ceoNotificationsListParamsSchema,
} from "@/lib/validations/ceo-notifications";
import type {
  CeoNotificationDetail,
  CeoNotificationListParams,
  CeoNotificationsActionResult,
  CeoNotificationsPageData,
} from "@/types/ceo-notifications";

function revalidateCeoNotifications() {
  revalidatePath(CEO_ROUTES.notifications);
  revalidatePath(CEO_ROUTES.notificationsCenter);
  revalidatePath(CEO_ROUTES.notificationsHistory);
  revalidatePath("/", "layout");
}

export async function getCeoNotificationsModuleData(
  params: CeoNotificationListParams,
): Promise<CeoNotificationsPageData> {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();
  return getCeoNotificationsPageData(
    supabase,
    profile,
    ceoNotificationsListParamsSchema.parse(params),
  );
}

export async function fetchCeoNotificationsPageAction(
  params: CeoNotificationListParams,
): Promise<CeoNotificationsPageData> {
  return getCeoNotificationsModuleData(params);
}

export async function fetchCeoNotificationDetailAction(input: unknown): Promise<
  | { success: true; data: CeoNotificationDetail }
  | { success: false; message: string }
> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoNotificationIdSchema.parse(input);
    const detail = await getCeoNotificationDetail(
      supabase,
      profile,
      parsed.notificationId,
    );
    if (!detail) {
      return { success: false, message: "Notification not found." };
    }
    return { success: true, data: detail };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load notification",
    };
  }
}

export async function markCeoNotificationReadAction(
  input: unknown,
): Promise<CeoNotificationsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoNotificationIdSchema.parse(input);
    await markCeoNotificationRead(supabase, profile, parsed.notificationId);
    revalidateCeoNotifications();
    return { success: true, message: "Notification marked as read." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to mark as read",
    };
  }
}

export async function markAllCeoNotificationsReadAction(): Promise<CeoNotificationsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    await markAllNotificationsRead(supabase, profile);
    revalidateCeoNotifications();
    return { success: true, message: "All notifications marked as read." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to mark all as read",
    };
  }
}

export async function archiveCeoNotificationAction(
  input: unknown,
): Promise<CeoNotificationsActionResult> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoNotificationIdSchema.parse(input);
    await archiveCeoNotification(supabase, profile, parsed.notificationId);
    revalidateCeoNotifications();
    return { success: true, message: "Notification archived." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to archive notification",
    };
  }
}

export async function navigateCeoNotificationAction(
  input: unknown,
): Promise<CeoNotificationsActionResult & { href?: string }> {
  try {
    const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
    const supabase = await createClient();
    const parsed = ceoNotificationNavigateSchema.parse(input);

    if (!parsed.href.startsWith("/")) {
      return { success: false, message: "Invalid navigation target." };
    }

    await completeCeoNotificationAfterNavigate(
      supabase,
      profile,
      parsed.notificationId,
    );
    revalidateCeoNotifications();
    return {
      success: true,
      message: "Notification completed.",
      href: parsed.href,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to complete notification",
    };
  }
}
