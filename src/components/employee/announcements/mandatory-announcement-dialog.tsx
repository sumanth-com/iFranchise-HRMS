"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanyAnnouncementIcon } from "@/components/organization/company-announcement-icon";
import { acknowledgeCompanyAnnouncementAction } from "@/lib/organization/actions/company-announcement-actions";
import type { CompanyAnnouncementEmployeeView } from "@/types/company-announcement";

type Props = {
  announcement: CompanyAnnouncementEmployeeView;
  onAccepted: (announcement: CompanyAnnouncementEmployeeView) => void;
};

/**
 * Entry-gate acknowledgement: title + short description + checkbox only.
 * Full content and attachments stay on My Announcements.
 */
export function MandatoryAnnouncementDialog({ announcement, onAccepted }: Props) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const checkboxId = `acknowledge-${announcement.id}`;
  const summary =
    announcement.shortDescription?.trim() ||
    "Please review this company announcement and confirm you have read it.";

  useEffect(() => {
    setChecked(false);
    setSubmitting(false);
  }, [announcement.id, announcement.versionId]);

  const handleAccept = () => {
    if (!checked || submitting) return;
    setSubmitting(true);
    onAccepted(announcement);
    void acknowledgeCompanyAnnouncementAction(announcement.id, announcement.versionId);
  };

  return (
    <Dialog
      open
      modal
      disablePointerDismissal
      onOpenChange={() => {
        /* Mandatory notices cannot be dismissed without acknowledgement. */
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="pointer-events-auto flex max-h-[min(88vh,32rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b px-5 py-4">
          <DialogTitle className="flex items-start gap-2.5 text-left">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white">
              <CompanyAnnouncementIcon iconKey={announcement.iconKey} className="size-4" />
            </span>
            <span className="min-w-0 leading-snug">{announcement.title}</span>
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
            {summary}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="relative z-20 m-0 shrink-0 flex-col items-stretch gap-3 border-t bg-background px-5 py-4 sm:flex-col sm:space-x-0">
          <label
            htmlFor={checkboxId}
            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm leading-snug transition-colors hover:bg-muted/50"
          >
            <input
              id={checkboxId}
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border accent-violet-600"
              checked={checked}
              disabled={submitting}
              onChange={(event) => setChecked(event.target.checked)}
            />
            I have read and understood this announcement.
          </label>
          <Button
            type="button"
            className="w-full"
            disabled={!checked || submitting}
            onClick={handleAccept}
          >
            Acknowledge &amp; Close
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            You can open the full notice anytime from My Announcements.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
