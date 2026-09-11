"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Megaphone } from "lucide-react";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { AnnouncementDocumentPreview } from "@/components/organization/announcement-document-preview";
import { CompanyAnnouncementIcon } from "@/components/organization/company-announcement-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  COMPANY_ANNOUNCEMENT_CATEGORY_LABELS,
  COMPANY_ANNOUNCEMENT_PRIORITY_LABELS,
} from "@/lib/organization/company-announcement-constants";
import {
  announcementViewStorageKey,
  isAnnouncementUnread,
} from "@/lib/organization/announcement-view-storage";
import {
  announcementAckStorageKey,
  readLocalAnnouncementAcks,
} from "@/lib/organization/mandatory-announcement-ack-storage";
import { cn } from "@/lib/utils";
import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcements: CompanyAnnouncementEmployeeView[];
  viewedKeys: ReadonlySet<string>;
  /** Prefer selecting this announcement when the modal opens. */
  initialAnnouncementId?: string | null;
  /** Called when the employee opens a specific announcement to read it. */
  onViewAnnouncement: (announcement: CompanyAnnouncementEmployeeView) => void;
};

export function EmployeeAnnouncementsModal({
  open,
  onOpenChange,
  announcements,
  viewedKeys,
  initialAnnouncementId = null,
  onViewAnnouncement,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localAcks, setLocalAcks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLocalAcks(readLocalAnnouncementAcks());
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      return;
    }
    if (announcements.length === 0) {
      setSelectedId(null);
      return;
    }
    const preferred =
      (initialAnnouncementId
        ? announcements.find((item) => item.id === initialAnnouncementId)
        : null) ??
      announcements.find((item) => isAnnouncementUnread(item, viewedKeys)) ??
      announcements[0];
    setSelectedId(preferred.id);
    onViewAnnouncement(preferred);
    // Mark on open only — not when viewedKeys/count updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, announcements, initialAnnouncementId]);

  const selected = useMemo(
    () => announcements.find((item) => item.id === selectedId) ?? null,
    [announcements, selectedId],
  );

  function selectAnnouncement(item: CompanyAnnouncementEmployeeView) {
    setSelectedId(item.id);
    onViewAnnouncement(item);
  }

  const published =
    selected?.publishedAt || selected?.publishAt
      ? format(new Date(selected.publishedAt ?? selected.publishAt!), "EEEE, d MMM yyyy · h:mm a")
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] w-[min(96vw,72rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-left text-lg sm:text-xl">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm">
              <Megaphone className="size-4" />
            </span>
            Announcements
          </DialogTitle>
          <DialogDescription className="text-left text-xs sm:text-sm">
            Company notices shared with you. Open an item to mark it as read.
          </DialogDescription>
        </DialogHeader>

        {announcements.length === 0 ? (
          <div className="flex min-h-[16rem] flex-1 items-center justify-center px-6 py-8">
            <EmptyState
              title="No announcements"
              description="There are no company announcements for you yet."
            />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)]">
            <div className="min-h-0 max-h-[min(40vh,22rem)] overflow-y-auto border-b md:max-h-none md:border-r md:border-b-0">
              <ul className="divide-y p-2">
                {announcements.map((item) => {
                  const unread = isAnnouncementUnread(item, viewedKeys);
                  const locallyAcked = localAcks.has(
                    announcementAckStorageKey(item.id, item.versionId),
                  );
                  const pending =
                    item.requiresAcknowledgement && !item.acknowledgedAt && !locallyAcked;
                  const acknowledged =
                    item.requiresAcknowledgement &&
                    Boolean(item.acknowledgedAt || locallyAcked);
                  const active = selected?.id === item.id;

                  return (
                    <li key={announcementViewStorageKey(item.id, item.versionId)}>
                      <button
                        type="button"
                        onClick={() => selectAnnouncement(item)}
                        className={cn(
                          "flex w-full flex-col gap-1.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                          active ? "bg-violet-500/10 ring-1 ring-violet-500/20" : "hover:bg-muted/50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-semibold tracking-tight text-foreground">
                            {item.title}
                          </p>
                          {unread ? (
                            <span className="mt-0.5 shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[item.category]} ·{" "}
                          {item.publishedAt || item.publishAt
                            ? format(new Date(item.publishedAt ?? item.publishAt!), "d MMM yyyy")
                            : "—"}
                        </p>
                        <span
                          className={cn(
                            "w-fit rounded-full px-2 py-0.5 text-[10px] font-medium",
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
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="shrink-0 space-y-2 border-b px-5 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                  {selected ? (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm">
                      <CompanyAnnouncementIcon iconKey={selected.iconKey} className="size-5" />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-snug tracking-tight sm:text-lg">
                      {selected?.title ?? "Announcement"}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {selected ? (
                        <>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                            {COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[selected.category]}
                          </span>
                          <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                            {COMPANY_ANNOUNCEMENT_PRIORITY_LABELS[selected.priority]}
                          </span>
                          {isAnnouncementUnread(selected, viewedKeys) ? (
                            <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-medium text-white">
                              Unread
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              Read
                            </span>
                          )}
                          {published ? (
                            <span className="text-xs text-muted-foreground">{published}</span>
                          ) : null}
                          {selected.companyName ? (
                            <span className="text-xs text-muted-foreground">
                              From {selected.companyName}
                            </span>
                          ) : null}
                          {selected.acknowledgedAt ? (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              Acknowledged{" "}
                              {format(new Date(selected.acknowledgedAt), "d MMM yyyy · h:mm a")}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {selected ? (
                  <div className="mx-auto w-full max-w-4xl space-y-5">
                    {selected.shortDescription ? (
                      <p className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] px-4 py-3 text-sm font-medium leading-relaxed text-foreground">
                        {selected.shortDescription}
                      </p>
                    ) : null}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground sm:text-[15px]">
                      {selected.content}
                    </div>
                    <AnnouncementDocumentPreview attachments={selected.attachments} size="large" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="flex shrink-0 justify-end border-t px-5 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
