"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Modal } from "@/components/common/modal";
import { AnnouncementDocumentPreview } from "@/components/organization/announcement-document-preview";
import { CompanyAnnouncementIcon } from "@/components/organization/company-announcement-icon";
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
        <div className="space-y-2">
          {announcements.map((item) => {
            const pending =
              item.requiresAcknowledgement &&
              !item.acknowledgedAt &&
              !localAcks.has(announcementAckStorageKey(item.id, item.versionId));
            return (
              <button
                key={`${item.id}-${item.versionId}`}
                type="button"
                onClick={() => setSelected(item)}
                className="flex w-full items-start justify-between gap-3 rounded-xl border bg-card p-4 text-left shadow-sm"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600/10 to-violet-600/10 text-violet-700">
                    <CompanyAnnouncementIcon iconKey={item.iconKey} className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[item.category]} ·{" "}
                      {COMPANY_ANNOUNCEMENT_PRIORITY_LABELS[item.priority]} ·{" "}
                      {item.publishedAt || item.publishAt
                        ? format(new Date(item.publishedAt ?? item.publishAt!), "d MMM yyyy")
                        : "—"}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    pending ? "bg-slate-500/10 text-slate-700" : "bg-emerald-500/10 text-emerald-700",
                  )}
                >
                  {pending ? "Pending acknowledgement" : item.requiresAcknowledgement ? "Acknowledged" : "Published"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.title ?? "Announcement"}
        description={
          selected
            ? `${COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[selected.category]} · ${COMPANY_ANNOUNCEMENT_PRIORITY_LABELS[selected.priority]}`
            : undefined
        }
        headerAddon={
          selected ? (
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white">
              <CompanyAnnouncementIcon iconKey={selected.iconKey} className="size-4" />
            </span>
          ) : null
        }
        showCancel={false}
        footer={
          <Button type="button" variant="outline" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected ? (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{selected.content}</p>
            <AnnouncementDocumentPreview attachments={selected.attachments} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
