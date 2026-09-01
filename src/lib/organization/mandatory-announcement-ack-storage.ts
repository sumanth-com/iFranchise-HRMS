const STORAGE_KEY = "ifranchise.hrms.mandatory-announcement-acks";

export function announcementAckStorageKey(announcementId: string, versionId: string) {
  return `${announcementId}:${versionId}`;
}

export function readLocalAnnouncementAcks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export function rememberLocalAnnouncementAck(announcementId: string, versionId: string) {
  if (typeof window === "undefined") return;
  const next = readLocalAnnouncementAcks();
  next.add(announcementAckStorageKey(announcementId, versionId));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
}

export function wasAnnouncementAckedLocally(announcementId: string, versionId: string) {
  return readLocalAnnouncementAcks().has(announcementAckStorageKey(announcementId, versionId));
}
