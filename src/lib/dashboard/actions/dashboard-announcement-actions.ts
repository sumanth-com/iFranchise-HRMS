"use server";

import { revalidatePath } from "next/cache";

import {
  saveDashboardAnnouncement,
  setDashboardAnnouncementPublished,
  softDeleteDashboardAnnouncement,
} from "@/lib/dashboard/services/dashboard-announcement-mutations";
import { listManagedDashboardAnnouncements } from "@/lib/dashboard/services/dashboard-announcement-queries";
import {
  canManageDashboardAnnouncements,
  DASHBOARD_ANNOUNCEMENT_MANAGE_PERMISSION,
} from "@/lib/dashboard/dashboard-announcement-permissions";
import { hasPermission } from "@/lib/permissions/utils";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { saveDashboardAnnouncementSchema } from "@/lib/validations/dashboard-announcement";
import type { DashboardAnnouncementActionResult } from "@/types/dashboard-announcement";
import type { DashboardAnnouncement } from "@/types/dashboard-announcement";

const MANAGE_PERMISSION = DASHBOARD_ANNOUNCEMENT_MANAGE_PERMISSION;

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message && !/supabase|postgres|rpc|sql/i.test(error.message)) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function revalidateAnnouncementSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/employee");
  revalidatePath("/ceo");
  revalidatePath("/manager");
}

async function requireAnnouncementManager() {
  const profile = await requireAuthenticatedProfile();
  if (!hasPermission(profile.permissionCodes, MANAGE_PERMISSION)) {
    throw new Error("You do not have permission to manage announcements.");
  }
  return profile;
}

export async function listManagedDashboardAnnouncementsAction(): Promise<
  | { success: true; data: DashboardAnnouncement[] }
  | { success: false; message: string }
> {
  try {
    const profile = await requireAnnouncementManager();
    const supabase = await createClient();
    const data = await listManagedDashboardAnnouncements(
      supabase,
      profile.employee.organizationId,
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function saveDashboardAnnouncementAction(
  formData: FormData,
): Promise<DashboardAnnouncementActionResult> {
  try {
    const profile = await requireAnnouncementManager();
    const supabase = await createClient();

    const idRaw = formData.get("id");
    const iconRaw = formData.get("iconKey");
    const parsed = saveDashboardAnnouncementSchema.parse({
      id: typeof idRaw === "string" && idRaw.trim() ? idRaw.trim() : undefined,
      title: String(formData.get("title") ?? ""),
      message: String(formData.get("message") ?? ""),
      iconKey:
        typeof iconRaw === "string" && iconRaw.trim() && iconRaw !== "none"
          ? iconRaw.trim()
          : null,
      priority: String(formData.get("priority") ?? "normal"),
      isPublished: String(formData.get("isPublished") ?? "false") === "true",
      clearImage: String(formData.get("clearImage") ?? "false") === "true",
    });

    const imageEntry = formData.get("image");
    const imageFile =
      imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;

    const data = await saveDashboardAnnouncement(supabase, profile, parsed, imageFile);
    revalidateAnnouncementSurfaces();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function deleteDashboardAnnouncementAction(
  announcementId: string,
): Promise<DashboardAnnouncementActionResult> {
  try {
    const profile = await requireAnnouncementManager();
    const supabase = await createClient();
    await softDeleteDashboardAnnouncement(supabase, profile, announcementId);
    revalidateAnnouncementSurfaces();
    return { success: true };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export async function setDashboardAnnouncementPublishedAction(
  announcementId: string,
  isPublished: boolean,
): Promise<DashboardAnnouncementActionResult> {
  try {
    const profile = await requireAnnouncementManager();
    const supabase = await createClient();
    const data = await setDashboardAnnouncementPublished(
      supabase,
      profile,
      announcementId,
      isPublished,
    );
    revalidateAnnouncementSurfaces();
    return { success: true, data };
  } catch (error) {
    return { success: false, message: friendlyError(error) };
  }
}

export { canManageDashboardAnnouncements };
