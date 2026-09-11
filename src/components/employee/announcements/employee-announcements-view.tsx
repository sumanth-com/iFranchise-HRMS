"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";

import { EmptyState } from "@/components/common/empty-state";
import { EmployeeAnnouncementsModal } from "@/components/employee/announcements/employee-announcements-modal";
import { CompanyAnnouncementIcon } from "@/components/organization/company-announcement-icon";
import {
  COMPANY_ANNOUNCEMENT_CATEGORY_LABELS,
  COMPANY_ANNOUNCEMENT_PRIORITY_LABELS,
} from "@/lib/organization/company-announcement-constants";
import {
  announcementViewStorageKey,
  isAnnouncementUnread,
  readLocalAnnouncementViews,
  rememberLocalAnnouncementView,
} from "@/lib/organization/announcement-view-storage";
import {
  announcementAckStorageKey,
  readLocalAnnouncementAcks,
} from "@/lib/organization/mandatory-announcement-ack-storage";
import { cn } from "@/lib/utils";
import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

type Props = {
  announcements: CompanyAnnouncementEmployeeView[];
};

export function EmployeeAnnouncementsView({ announcements }: Props) {
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [viewedKeys, setViewedKeys] = useState<Set<string>>(new Set());
  const [localAcks, setLocalAcks] = useState<Set<string>>(new Set());

  useEffect(() => {
    setViewedKeys(readLocalAnnouncementViews());
    setLocalAcks(readLocalAnnouncementAcks());
  }, []);

  const handleView = useCallback((item: CompanyAnnouncementEmployeeView) => {
    rememberLocalAnnouncementView(item.id, item.versionId);
    setViewedKeys((prev) => {
      const key = announcementViewStorageKey(item.id, item.versionId);
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Company notices shared with you. Open an item to read it and mark it as read.
        </p>
      </div>

      {announcements.length === 0 ? (
        <EmptyState title="No announcements" description="There are no company announcements for you yet." />
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {announcements.map((item) => {
            const locallyAcked = localAcks.has(
              announcementAckStorageKey(item.id, item.versionId),
            );
            const pending =
              item.requiresAcknowledgement && !item.acknowledgedAt && !locallyAcked;
            const acknowledged =
              item.requiresAcknowledgement && Boolean(item.acknowledgedAt || locallyAcked);
            const unread = isAnnouncementUnread(item, viewedKeys);
            const ackStamp = item.acknowledgedAt
              ? format(new Date(item.acknowledgedAt), "d MMM yyyy · h:mm a")
              : null;

            return (
              <button
                key={`${item.id}-${item.versionId}`}
                type="button"
                onClick={() => {
                  setFocusId(item.id);
                  setOpen(true);
                }}
                className="flex h-full min-h-[9.5rem] flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600/10 to-violet-600/10 text-violet-700">
                    <CompanyAnnouncementIcon iconKey={item.iconKey} className="size-4" />
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      pending
                        ? "bg-slate-500/10 text-slate-700"
                        : acknowledged
                          ? "bg-emerald-500/10 text-emerald-700"
                          : unread
                            ? "bg-violet-500/10 text-violet-700"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {pending
                      ? "Pending"
                      : acknowledged
                        ? "Acknowledged"
                        : unread
                          ? "Unread"
                          : "Read"}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold tracking-tight text-foreground">
                    {item.title}
                  </p>
                  {item.shortDescription ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.shortDescription}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto space-y-1 border-t pt-2">
                  <p className="text-[11px] text-muted-foreground">
                    {COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[item.category]} ·{" "}
                    {COMPANY_ANNOUNCEMENT_PRIORITY_LABELS[item.priority]} ·{" "}
                    {item.publishedAt || item.publishAt
                      ? format(new Date(item.publishedAt ?? item.publishAt!), "d MMM yyyy")
                      : "—"}
                  </p>
                  {acknowledged ? (
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      {ackStamp ? `Acknowledged ${ackStamp}` : "Acknowledged"}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <EmployeeAnnouncementsModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setFocusId(null);
        }}
        announcements={announcements}
        viewedKeys={viewedKeys}
        initialAnnouncementId={focusId}
        onViewAnnouncement={handleView}
      />
    </div>
  );
}
