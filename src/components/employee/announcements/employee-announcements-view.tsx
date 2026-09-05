"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

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
  announcementAckStorageKey,
  readLocalAnnouncementAcks,
} from "@/lib/organization/mandatory-announcement-ack-storage";
import { cn } from "@/lib/utils";
import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

type Props = {
  announcements: CompanyAnnouncementEmployeeView[];
};

export function EmployeeAnnouncementsView({ announcements }: Props) {
  const [selected, setSelected] = useState<CompanyAnnouncementEmployeeView | null>(null);
  const [localAcks, setLocalAcks] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalAcks(readLocalAnnouncementAcks());
  }, []);

  const published =
    selected?.publishedAt || selected?.publishAt
      ? format(new Date(selected.publishedAt ?? selected.publishAt!), "EEEE, d MMM yyyy")
      : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Company notices shared with you. Acknowledged items stay available to read again.
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
            const ackStamp = item.acknowledgedAt
              ? format(new Date(item.acknowledgedAt), "d MMM yyyy · h:mm a")
              : null;

            return (
              <button
                key={`${item.id}-${item.versionId}`}
                type="button"
                onClick={() => setSelected(item)}
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
                          : "bg-violet-500/10 text-violet-700",
                    )}
                  >
                    {pending ? "Pending" : acknowledged ? "Acknowledged" : "Published"}
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

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,900px)] w-[min(96vw,70vw)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader className="shrink-0 space-y-2 border-b px-6 py-4 pr-12">
            <DialogTitle className="flex items-start gap-3 text-left text-xl">
              {selected ? (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm">
                  <CompanyAnnouncementIcon iconKey={selected.iconKey} className="size-5" />
                </span>
              ) : null}
              <span className="min-w-0 leading-snug">{selected?.title ?? "Announcement"}</span>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 text-left">
              {selected ? (
                <>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[selected.category]}
                  </span>
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    {COMPANY_ANNOUNCEMENT_PRIORITY_LABELS[selected.priority]}
                  </span>
                  {published ? (
                    <span className="text-xs text-muted-foreground">Published {published}</span>
                  ) : null}
                  {selected.acknowledgedAt ? (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      Acknowledged{" "}
                      {format(new Date(selected.acknowledgedAt), "d MMM yyyy · h:mm a")}
                    </span>
                  ) : null}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
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

          <div className="flex shrink-0 justify-end border-t px-6 py-3">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
