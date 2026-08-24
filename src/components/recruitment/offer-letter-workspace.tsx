"use client";

import { Download, Eye, FileText, Loader2, Save, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/common/button";
import {
  createOfferAction,
  pushCandidateToOnboardingAction,
} from "@/lib/recruitment/actions";
import { OFFER_STATUS_LABELS, RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import {
  assertOfferLetterFile,
  OFFER_LETTER_MAX_BYTES,
} from "@/lib/validations/recruitment";
import { resolveOfferLetterFileName } from "@/lib/recruitment/services/offer-letter-display";
import { cn } from "@/lib/utils";
import type { CandidateDetail } from "@/types/recruitment";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type OfferLetterWorkspaceProps = {
  detail: CandidateDetail | null;
  loading: boolean;
  canOffer: boolean;
  onboardingHref?: string;
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
};

export function OfferLetterWorkspace({
  detail,
  loading,
  canOffer,
  onboardingHref = RECRUITMENT_ROUTES.onboarding,
  onClose,
  onRefresh,
}: OfferLetterWorkspaceProps) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const latestOffer = detail?.offers[0];
  const hasStoredLetter = Boolean(latestOffer?.offerLetterPath);
  const activeFile = uploadedFile;
  const canSaveLetter = Boolean(canOffer && activeFile && !isPending);
  const canPushToOnboarding = Boolean(canOffer && hasStoredLetter && !isPending);
  const displayFileName =
    activeFile?.name ??
    (hasStoredLetter
      ? resolveOfferLetterFileName({
          storedFileName: latestOffer?.offerLetterFileName,
          offerLetterPath: latestOffer?.offerLetterPath,
          candidateName: detail?.fullName,
          jobTitle: detail?.jobTitle,
        })
      : null);
  const storedViewHref =
    latestOffer?.id && hasStoredLetter && !activeFile
      ? `/api/recruitment/offers/${latestOffer.id}/pdf?inline=1`
      : null;
  const storedDownloadHref =
    latestOffer?.id && hasStoredLetter && !activeFile
      ? `/api/recruitment/offers/${latestOffer.id}/pdf`
      : null;
  const inOnboardingList = Boolean(detail?.inOnboardingList);

  useEffect(() => {
    if (!detail) return;
    setUploadedFile(null);
    setDragging(false);
  }, [detail?.id]);

  function handleFileChange(file: File | null) {
    if (!file) {
      setUploadedFile(null);
      return;
    }

    try {
      assertOfferLetterFile(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid offer letter file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadedFile(file);
  }

  function openFilePicker() {
    if (!canOffer || isPending) return;
    fileInputRef.current?.click();
  }

  function uploadLetter() {
    if (!detail || !canOffer || !uploadedFile) {
      toast.error("Choose an offer letter file first");
      return;
    }

    const formData = new FormData();
    formData.set("candidateId", detail.id);
    formData.set("offerFile", uploadedFile);

    startTransition(async () => {
      const result = await createOfferAction(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(hasStoredLetter ? "Offer letter updated" : "Offer letter saved");
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onRefresh();
    });
  }

  function pushToOnboarding() {
    if (!detail || !canOffer || !hasStoredLetter) {
      toast.error("Save an offer letter before updating onboarding");
      return;
    }

    startTransition(async () => {
      const result = await pushCandidateToOnboardingAction(detail.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        inOnboardingList
          ? `${detail.fullName} updated on the onboarding list`
          : `${detail.fullName} added to the onboarding list`,
      );
      onRefresh();
    });
  }

  const maxSizeLabel = formatBytes(OFFER_LETTER_MAX_BYTES);
  const statusLabel = latestOffer
    ? OFFER_STATUS_LABELS[latestOffer.offerStatus]
    : "No letter yet";
  const onboardingStatusLabel = inOnboardingList ? "In onboarding list" : "Not in onboarding yet";

  if (loading && !detail) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading candidate…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border bg-card p-8 text-center">
        <p className="text-sm font-medium">Select a candidate</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Choose someone from the list to manage their offer letter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Offer letter
          </p>
          <h2 className="truncate text-lg font-semibold">{detail.fullName}</h2>
          <p className="text-xs text-muted-foreground">
            {detail.jobTitle} · {detail.email} · {statusLabel} · {onboardingStatusLabel}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">
          Choose a file to save the offer letter. Use the actions below to view, download, or add
          this candidate to Employee Onboarding.
        </p>

        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={isPending || !canOffer}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {displayFileName ? (
            <div
              className={cn(
                "relative overflow-hidden rounded-xl border bg-card shadow-sm",
                canOffer && !isPending && "cursor-pointer hover:shadow-md",
              )}
              onClick={canOffer && !isPending ? openFilePicker : undefined}
              onKeyDown={(event) => {
                if (!canOffer || isPending) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              role={canOffer ? "button" : undefined}
              tabIndex={canOffer ? 0 : undefined}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.1),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.08),transparent_38%)]" />

              <div className="relative flex min-h-[10rem]">
                <div className="flex w-[34%] min-w-[7.5rem] shrink-0 items-center justify-center border-r border-border/60 bg-gradient-to-br from-muted/40 via-background to-primary/[0.06]">
                  <span className="relative flex size-[3.75rem] items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-primary via-primary to-violet-600 text-primary-foreground shadow-[0_12px_30px_-12px_rgba(79,70,229,0.65)] ring-1 ring-white/25">
                    <FileText className="size-8" strokeWidth={1.6} />
                  </span>
                </div>

                <div className="relative flex min-w-0 flex-1 flex-col justify-center px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                    {hasStoredLetter && !activeFile ? "Current offer letter" : "Selected file"}
                  </p>
                  <p className="mt-1 truncate text-base font-semibold tracking-tight">
                    {displayFileName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeFile
                      ? `${formatBytes(activeFile.size)} · not saved yet`
                      : hasStoredLetter
                        ? "Saved · click the card to choose a replacement file"
                        : ""}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canOffer || isPending}
              onClick={openFilePicker}
              onDragOver={(event) => {
                event.preventDefault();
                if (canOffer && !isPending) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (!canOffer || isPending) return;
                handleFileChange(event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "group relative flex min-h-[14rem] w-full overflow-hidden rounded-xl border text-left shadow-sm transition-all",
                canOffer && !isPending && "cursor-pointer hover:shadow-md",
                (!canOffer || isPending) && "cursor-not-allowed opacity-70",
                dragging && "border-primary ring-2 ring-primary/20",
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.12),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.08),transparent_38%)]" />

              <div className="relative flex w-[38%] min-w-[8.5rem] shrink-0 items-center justify-center border-r border-border/60 bg-gradient-to-br from-muted/40 via-background to-primary/[0.06]">
                <span
                  className={cn(
                    "relative flex size-[4.75rem] items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-primary via-primary to-violet-600 text-primary-foreground shadow-[0_12px_30px_-12px_rgba(79,70,229,0.65)] ring-1 ring-white/25",
                    canOffer && !isPending && "transition-transform duration-300 group-hover:scale-[1.02]",
                  )}
                >
                  <UploadCloud className="size-[2.1rem]" strokeWidth={1.6} />
                </span>
              </div>

              <div className="relative flex min-w-0 flex-1 flex-col justify-center px-4 py-4 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                  Offer letter
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Choose a file
                </h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Drag and drop or browse. Any file type up to {maxSizeLabel}.
                </p>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t bg-card px-4 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Actions
        </p>

        <div className="grid grid-cols-2 gap-2">
          {storedViewHref ? (
            <a
              href={storedViewHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
            >
              <Eye className="mr-2 h-4 w-4" />
              View letter
            </a>
          ) : (
            <Button type="button" variant="outline" className="w-full" disabled>
              <Eye className="mr-2 h-4 w-4" />
              View letter
            </Button>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={!canSaveLetter}
            onClick={uploadLetter}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>

          {storedDownloadHref ? (
            <a
              href={storedDownloadHref}
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          ) : (
            <Button type="button" variant="outline" className="w-full" disabled>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!canPushToOnboarding}
            onClick={pushToOnboarding}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {inOnboardingList ? "Update onboarding" : "Add to onboarding"}
          </Button>
        </div>

        {!canOffer ? (
          <p className="mt-3 text-xs text-muted-foreground">
            View and download are available. Contact HR admin for permission to save letters or
            update onboarding.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {inOnboardingList ? (
              <>
                Listed in{" "}
                <Link
                  href={onboardingHref}
                  className="font-medium text-primary hover:underline"
                >
                  Employee Onboarding
                </Link>
              </>
            ) : activeFile ? (
              "Save the letter, then add to onboarding."
            ) : hasStoredLetter ? (
              "Letter saved. Add to onboarding when ready."
            ) : (
              "Choose a file above, then save."
            )}
          </p>
        )}
      </div>
    </div>
  );
}
