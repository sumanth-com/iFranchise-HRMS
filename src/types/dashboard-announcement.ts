export const DASHBOARD_ANNOUNCEMENT_PRIORITIES = ["normal", "important"] as const;

export type DashboardAnnouncementPriority =
  (typeof DASHBOARD_ANNOUNCEMENT_PRIORITIES)[number];

export const DASHBOARD_ANNOUNCEMENT_ICON_KEYS = [
  "megaphone",
  "bell",
  "sparkles",
  "info",
  "calendar",
] as const;

export type DashboardAnnouncementIconKey =
  (typeof DASHBOARD_ANNOUNCEMENT_ICON_KEYS)[number];

export type DashboardAnnouncement = {
  id: string;
  title: string;
  message: string;
  imageStoragePath: string | null;
  imageUrl: string | null;
  iconKey: DashboardAnnouncementIconKey | null;
  priority: DashboardAnnouncementPriority;
  isPublished: boolean;
  publishedAt: string | null;
  sortOrder: number;
  updatedAt: string;
};

export type DashboardAnnouncementActionResult =
  | { success: true; data?: DashboardAnnouncement }
  | { success: false; message: string };
