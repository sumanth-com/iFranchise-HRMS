import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  announcementViewStorageKey,
  countUnreadAnnouncements,
  isAnnouncementUnread,
} from "@/lib/organization/announcement-view-storage";

describe("announcement view / unread helpers", () => {
  it("builds a stable storage key per announcement version", () => {
    assert.equal(announcementViewStorageKey("a1", "v1"), "a1:v1");
  });

  it("treats announcements as unread until viewed", () => {
    const items = [
      { id: "a1", versionId: "v1" },
      { id: "a2", versionId: "v2" },
    ];
    const viewed = new Set([announcementViewStorageKey("a1", "v1")]);

    assert.equal(isAnnouncementUnread(items[0], viewed), false);
    assert.equal(isAnnouncementUnread(items[1], viewed), true);
    assert.equal(countUnreadAnnouncements(items, viewed), 1);
  });

  it("returns zero when everything has been viewed", () => {
    const items = [
      { id: "a1", versionId: "v1" },
      { id: "a2", versionId: "v2" },
    ];
    const viewed = new Set([
      announcementViewStorageKey("a1", "v1"),
      announcementViewStorageKey("a2", "v2"),
    ]);

    assert.equal(countUnreadAnnouncements(items, viewed), 0);
  });

  it("does not invent unread when the list is empty", () => {
    assert.equal(countUnreadAnnouncements([], new Set()), 0);
  });
});
