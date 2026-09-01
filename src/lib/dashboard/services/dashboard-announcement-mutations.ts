import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  ANNOUNCEMENT_BUCKET,
  getDashboardAnnouncementById,
  type LooseRow,
  mapAnnouncement,
  signAnnouncementImageAdmin,
} from "@/lib/dashboard/services/dashboard-announcement-queries";
import type { SaveDashboardAnnouncementInput } from "@/lib/validations/dashboard-announcement";
import type { UserProfile } from "@/types/auth";
import type { DashboardAnnouncement } from "@/types/dashboard-announcement";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function extensionForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function saveDashboardAnnouncement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: SaveDashboardAnnouncementInput,
  imageFile?: File | null,
): Promise<DashboardAnnouncement> {
  const organizationId = profile.employee.organizationId;
  const now = new Date().toISOString();

  let existingImagePath: string | null = null;
  let existingPublishedAt: string | null = null;
  let wasAlreadyPublished = false;

  if (input.id) {
    const existing = await getDashboardAnnouncementById(supabase, organizationId, input.id);
    if (!existing) throw new Error("Announcement not found.");
    existingImagePath = existing.imageStoragePath;
    existingPublishedAt = existing.publishedAt;
    wasAlreadyPublished = existing.isPublished;
  }

  let imageStoragePath = existingImagePath;
  if (input.clearImage) {
    imageStoragePath = null;
  }

  if (imageFile && imageFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
      throw new Error("Please upload a JPG, PNG, or WebP image.");
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      throw new Error("Image must be 2 MB or smaller.");
    }

    const announcementId = input.id ?? crypto.randomUUID();
    const ext = extensionForMime(imageFile.type);
    const path = `${organizationId}/announcements/${announcementId}.${ext}`;
    const buffer = Buffer.from(await imageFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(ANNOUNCEMENT_BUCKET)
      .upload(path, buffer, {
        contentType: imageFile.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[announcements] image upload failed", uploadError.message);
      throw new Error("Unable to upload image. Please try again.");
    }

    imageStoragePath = path;
  }

  const publishedAt = input.isPublished
    ? wasAlreadyPublished && existingPublishedAt
      ? existingPublishedAt
      : now
    : null;

  const payload = {
    organization_id: organizationId,
    title: input.title.trim(),
    message: input.message.trim(),
    icon_key: input.iconKey ?? null,
    priority: input.priority,
    is_published: input.isPublished,
    published_at: publishedAt,
    published_by: input.isPublished ? profile.userId : null,
    image_storage_path: imageStoragePath,
    updated_by: profile.userId,
    updated_at: now,
    status: "active" as const,
    deleted_at: null,
  };

  let row: LooseRow;

  if (input.id) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("dashboard_announcements")
      .update(payload)
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .select(
        "id, title, message, image_storage_path, icon_key, priority, is_published, published_at, sort_order, updated_at, created_at",
      )
      .single();

    if (error || !data) {
      console.error("[announcements] update failed", error?.message);
      throw new Error("Unable to update announcement.");
    }
    row = data as LooseRow;
  } else {
    const { data, error } = await supabase
      .schema("hrms")
      .from("dashboard_announcements")
      .insert({
        ...payload,
        created_by: profile.userId,
        created_at: now,
      })
      .select(
        "id, title, message, image_storage_path, icon_key, priority, is_published, published_at, sort_order, updated_at, created_at",
      )
      .single();

    if (error || !data) {
      console.error("[announcements] create failed", error?.message);
      throw new Error("Unable to create announcement.");
    }
    row = data as LooseRow;
  }

  const imageUrl = await signAnnouncementImageAdmin(
    row.image_storage_path ? String(row.image_storage_path) : null,
  );
  return mapAnnouncement(row, imageUrl);
}

export async function softDeleteDashboardAnnouncement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  announcementId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const organizationId = profile.employee.organizationId;

  const { data: softDeleted, error: softDeleteError } = await supabase
    .schema("hrms")
    .from("dashboard_announcements")
    .update({
      deleted_at: now,
      status: "inactive",
      is_published: false,
      updated_at: now,
      updated_by: profile.userId,
    })
    .eq("id", announcementId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (!softDeleteError && softDeleted) {
    return;
  }

  // Older SELECT RLS required deleted_at IS NULL on the updated row, which
  // rejects soft-delete. Hard delete is still allowed by the DELETE policy.
  const { error: hardDeleteError } = await supabase
    .schema("hrms")
    .from("dashboard_announcements")
    .delete()
    .eq("id", announcementId)
    .eq("organization_id", organizationId);

  if (hardDeleteError) {
    console.error(
      "[announcements] delete failed",
      softDeleteError?.message,
      hardDeleteError.message,
    );
    throw new Error("Unable to remove announcement.");
  }
}

export async function setDashboardAnnouncementPublished(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  announcementId: string,
  isPublished: boolean,
): Promise<DashboardAnnouncement> {
  const now = new Date().toISOString();
  const { data: existing, error: findError } = await supabase
    .schema("hrms")
    .from("dashboard_announcements")
    .select("published_at, is_published")
    .eq("id", announcementId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (findError || !existing) {
    throw new Error("Announcement not found.");
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("dashboard_announcements")
    .update({
      is_published: isPublished,
      published_at: isPublished
        ? existing.is_published
          ? existing.published_at
          : now
        : null,
      published_by: isPublished ? profile.userId : null,
      updated_at: now,
      updated_by: profile.userId,
    })
    .eq("id", announcementId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .select(
      "id, title, message, image_storage_path, icon_key, priority, is_published, published_at, sort_order, updated_at, created_at",
    )
    .single();

  if (error || !data) {
    console.error("[announcements] publish toggle failed", error?.message);
    throw new Error("Unable to update publish status.");
  }

  const imageUrl = await signAnnouncementImageAdmin(
    data.image_storage_path ? String(data.image_storage_path) : null,
  );
  return mapAnnouncement(data as LooseRow, imageUrl);
}
