"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { acknowledgeCompanyAnnouncementAction } from "@/lib/organization/actions/company-announcement-actions";
import { AnnouncementDocumentPreview } from "@/components/organization/announcement-document-preview";
import { CompanyAnnouncementIcon } from "@/components/organization/company-announcement-icon";
import {
  COMPANY_ANNOUNCEMENT_CATEGORY_LABELS,
  COMPANY_ANNOUNCEMENT_PRIORITY_LABELS,
} from "@/lib/organization/company-announcement-constants";
import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

type Props = {
  announcement: CompanyAnnouncementEmployeeView;
  onAcknowledged: (announcementId: string) => void;
};

export function MandatoryAnnouncementDialog({ announcement, onAcknowledged }: Props) {
  const [checked, setChecked] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const contentRef = useRef<HTMLDivElement>(null);
  const published = announcement.publishedAt ?? announcement.publishAt;

  useEffect(() => {
    setChecked(false);
    setReachedEnd(false);
    setError(null);
    const node = contentRef.current;
    if (!node) return;
    const markIfShort = () => {
      if (node.scrollHeight <= node.clientHeight + 8) setReachedEnd(true);
    };
    markIfShort();
    const frame = requestAnimationFrame(markIfShort);
    return () => cancelAnimationFrame(frame);
  }, [announcement.id, announcement.versionId]);

  return (
    <Dialog
      open
      modal
      disablePointerDismissal
      onOpenChange={() => {
        /* Mandatory notices cannot be dismissed. */
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92vh,46rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white">
              <CompanyAnnouncementIcon iconKey={announcement.iconKey} className="size-4" />
            </span>
            {announcement.title}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {COMPANY_ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}
            </span>
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700">
              {COMPANY_ANNOUNCEMENT_PRIORITY_LABELS[announcement.priority]}
            </span>
            {published ? <span>Published {format(new Date(published), "d MMM yyyy")}</span> : null}
          </DialogDescription>
          <p className="text-xs text-muted-foreground">{announcement.companyName} · Human Resources</p>
        </DialogHeader>

        <div
          ref={contentRef}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
          onScroll={(event) => {
            const node = event.currentTarget;
            if (node.scrollHeight - node.scrollTop - node.clientHeight < 12) {
              setReachedEnd(true);
            }
          }}
        >
          {announcement.shortDescription ? (
            <p className="mb-3 text-sm font-medium">{announcement.shortDescription}</p>
          ) : null}
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {announcement.content}
          </div>
          <AnnouncementDocumentPreview attachments={announcement.attachments} />
        </div>

        <DialogFooter className="m-0 shrink-0 flex-col items-stretch gap-3 border-t px-5 py-3 sm:flex-col sm:space-x-0">
          {!reachedEnd ? (
            <p className="text-xs text-muted-foreground">Scroll through the announcement to continue.</p>
          ) : null}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border"
              checked={checked}
              disabled={!reachedEnd}
              onChange={(event) => setChecked(event.target.checked)}
            />
            I acknowledge that I have read this announcement.
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button
            type="button"
            disabled={!checked || !reachedEnd || isPending}
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const result = await acknowledgeCompanyAnnouncementAction(
                  announcement.id,
                  announcement.versionId,
                );
                if (!result.success) {
                  setError(result.message);
                  return;
                }
                onAcknowledged(announcement.id);
              });
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Accept & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
