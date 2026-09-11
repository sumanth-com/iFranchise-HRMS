import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

const STORAGE_KEY = "ifranchise.hrms.announcement-views";

export function announcementViewStorageKey(announcementId: string, versionId: string) {
  return `${announcementId}:${versionId}`;
}

export function readLocalAnnouncementViews(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export function rememberLocalAnnouncementView(announcementId: string, versionId: string) {
  if (typeof window === "undefined") return;
  const next = readLocalAnnouncementViews();
  next.add(announcementViewStorageKey(announcementId, versionId));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
}

export function wasAnnouncementViewedLocally(announcementId: string, versionId: string) {
  return readLocalAnnouncementViews().has(
    announcementViewStorageKey(announcementId, versionId),
  );
}

/** Unread = not yet opened/viewed by this employee in this browser. */
export function isAnnouncementUnread(
  item: Pick<CompanyAnnouncementEmployeeView, "id" | "versionId">,
  viewedKeys: ReadonlySet<string>,
) {
  return !viewedKeys.has(announcementViewStorageKey(item.id, item.versionId));
}

export function countUnreadAnnouncements(
  items: Array<Pick<CompanyAnnouncementEmployeeView, "id" | "versionId">>,
  viewedKeys: ReadonlySet<string>,
) {
  return items.reduce(
    (count, item) => count + (isAnnouncementUnread(item, viewedKeys) ? 1 : 0),
    0,
  );
}
