"use client";

import { useEffect, useState } from "react";
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
  onAcknowledgeFailed: (
    announcement: CompanyAnnouncementEmployeeView,
    message: string,
  ) => void;
  onAcknowledgeSucceeded: () => void;
};

export function MandatoryAnnouncementDialog({
  announcement,
  onAcknowledged,
  onAcknowledgeFailed,
  onAcknowledgeSucceeded,
}: Props) {
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const published = announcement.publishedAt ?? announcement.publishAt;
  const checkboxId = `acknowledge-${announcement.id}`;

  useEffect(() => {
    setChecked(false);
    setError(null);
    setIsSubmitting(false);
  }, [announcement.id, announcement.versionId]);

  const handleAccept = () => {
    if (!checked || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    onAcknowledged(announcement.id);

    void acknowledgeCompanyAnnouncementAction(announcement.id, announcement.versionId).then(
      (result) => {
        if (!result.success) {
          setIsSubmitting(false);
          setError(result.message);
          onAcknowledgeFailed(announcement, result.message);
          return;
        }
        onAcknowledgeSucceeded();
      },
    );
  };

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
        className="pointer-events-auto flex max-h-[min(92vh,46rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {announcement.shortDescription ? (
            <p className="mb-3 text-sm font-medium">{announcement.shortDescription}</p>
          ) : null}
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {announcement.content}
          </div>
          <AnnouncementDocumentPreview attachments={announcement.attachments} />
        </div>

        <DialogFooter className="relative z-20 m-0 shrink-0 flex-col items-stretch gap-3 border-t bg-background px-5 py-3 sm:flex-col sm:space-x-0">
          <label
            htmlFor={checkboxId}
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm leading-snug transition-colors hover:bg-muted/50"
          >
            <input
              id={checkboxId}
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border accent-violet-600"
              checked={checked}
              disabled={isSubmitting}
              onChange={(event) => setChecked(event.target.checked)}
            />
            I acknowledge that I have read this announcement.
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button
            type="button"
            className="w-full"
            disabled={!checked || isSubmitting}
            onClick={handleAccept}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Accept & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
