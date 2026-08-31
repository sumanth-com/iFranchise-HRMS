import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createSignedStorageUrlIfExists } from "@/lib/storage/signed-url";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DashboardAnnouncement,
  DashboardAnnouncementIconKey,
  DashboardAnnouncementPriority,
} from "@/types/dashboard-announcement";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

const ANNOUNCEMENT_BUCKET = "company-assets";

function mapAnnouncement(
  row: LooseRow,
  imageUrl: string | null = null,
): DashboardAnnouncement {
  const iconRaw = row.icon_key ? String(row.icon_key) : null;
  const iconKey = (
    ["megaphone", "bell", "sparkles", "info", "calendar"] as const
  ).includes(iconRaw as DashboardAnnouncementIconKey)
    ? (iconRaw as DashboardAnnouncementIconKey)
    : null;

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    imageStoragePath: row.image_storage_path ? String(row.image_storage_path) : null,
    imageUrl,
    iconKey,
    priority: (row.priority === "important" ? "important" : "normal") as DashboardAnnouncementPriority,
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at ? String(row.published_at) : null,
    sortOrder: Number(row.sort_order ?? 0),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

async function signAnnouncementImages(
  supabase: AuthSupabaseClient,
  rows: LooseRow[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  await Promise.all(
    rows.map(async (row) => {
      const id = String(row.id);
      const path = row.image_storage_path ? String(row.image_storage_path) : null;
      if (!path) {
        result.set(id, null);
        return;
      }
      const url = await createSignedStorageUrlIfExists(supabase, ANNOUNCEMENT_BUCKET, path);
      result.set(id, url);
    }),
  );
  return result;
}

/** Published announcements for dashboard carousel (any authenticated org member). */
export async function listPublishedDashboardAnnouncements(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<DashboardAnnouncement[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("dashboard_announcements")
    .select(
      "id, title, message, image_storage_path, icon_key, priority, is_published, published_at, sort_order, updated_at, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("is_published", true)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("priority", { ascending: true })
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[announcements] published list failed", error.message);
    return [];
  }

  const rows = (data ?? []) as LooseRow[];
  // Important first (enum order: important before normal if we reverse — postgres enums
  // sort by definition order: normal, important). Sort in JS instead.
  rows.sort((a, b) => {
    const aImp = a.priority === "important" ? 0 : 1;
    const bImp = b.priority === "important" ? 0 : 1;
    if (aImp !== bImp) return aImp - bImp;
    const aPub = String(a.published_at ?? a.created_at ?? "");
    const bPub = String(b.published_at ?? b.created_at ?? "");
    return bPub.localeCompare(aPub);
  });

  const signed = await signAnnouncementImages(supabase, rows);
  return rows.map((row) => mapAnnouncement(row, signed.get(String(row.id)) ?? null));
}

/** Full list for HR/CEO manage UI. */
export async function listManagedDashboardAnnouncements(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<DashboardAnnouncement[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("dashboard_announcements")
    .select(
      "id, title, message, image_storage_path, icon_key, priority, is_published, published_at, sort_order, updated_at, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error("Unable to load announcements.");

  const rows = (data ?? []) as LooseRow[];
  const signed = await signAnnouncementImages(supabase, rows);
  return rows.map((row) => mapAnnouncement(row, signed.get(String(row.id)) ?? null));
}

export async function getDashboardAnnouncementById(
  supabase: AuthSupabaseClient,
  organizationId: string,
  id: string,
): Promise<DashboardAnnouncement | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("dashboard_announcements")
    .select(
      "id, title, message, image_storage_path, icon_key, priority, is_published, published_at, sort_order, updated_at, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error("Unable to load announcement.");
  if (!data) return null;

  const signed = await signAnnouncementImages(supabase, [data as LooseRow]);
  return mapAnnouncement(data as LooseRow, signed.get(String(data.id)) ?? null);
}

export { ANNOUNCEMENT_BUCKET, mapAnnouncement };
export type { LooseRow };

/** Use admin client only when signing must succeed for viewers without asset.view. */
export async function signAnnouncementImageAdmin(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path?.trim()) return null;
  try {
    const admin = createAdminClient();
    return createSignedStorageUrlIfExists(admin, ANNOUNCEMENT_BUCKET, path.trim());
  } catch {
    return null;
  }
}
