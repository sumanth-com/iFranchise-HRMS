"use client";

import { FileText, ListPlus, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { buttonVariants } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createOfferAction,
  deleteOfferLetterAction,
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
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
};

export function OfferLetterWorkspace({
  detail,
  loading,
  canOffer,
  onClose,
  onRefresh,
}: OfferLetterWorkspaceProps) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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
      toast.error("Choose an offer letter file to upload");
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

      toast.success(
        hasStoredLetter
          ? "Offer letter updated and saved"
          : "Offer letter saved — you can add them to onboarding now",
      );
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onRefresh();
    });
  }

  function saveAndPushToOnboarding() {
    if (!detail || !canOffer || !activeFile) {
      toast.error("Choose an offer letter file first");
      return;
    }

    const formData = new FormData();
    formData.set("candidateId", detail.id);
    formData.set("offerFile", activeFile);

    startTransition(async () => {
      const uploadResult = await createOfferAction(formData);
      if (!uploadResult.success) {
        toast.error(uploadResult.message);
        return;
      }

      const pushResult = await pushCandidateToOnboardingAction(detail.id);
      if (!pushResult.success) {
        toast.error(pushResult.message);
        onRefresh();
        return;
      }

      toast.success(`${detail.fullName} saved and added to onboarding`);
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onRefresh();
    });
  }

  function pushToOnboarding() {
    if (!detail || !canOffer || !hasStoredLetter) {
      toast.error("Upload an offer letter before adding to onboarding");
      return;
    }

    startTransition(async () => {
      const result = await pushCandidateToOnboardingAction(detail.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(`${detail.fullName} is now on the onboarding list`);
      onRefresh();
    });
  }

  function confirmDelete() {
    if (!latestOffer?.id || !canOffer) return;

    startTransition(async () => {
      const result = await deleteOfferLetterAction(latestOffer.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Offer letter removed");
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDeleteConfirmOpen(false);
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
          Choose someone from the list to upload their offer letter for onboarding.
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
          Upload and store the offer letter here. Use Add to onboarding list when you want this
          person to appear under Employee Onboarding. Stored letters can be viewed anytime below.
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
            <div className="space-y-3">
              <div
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-card shadow-sm",
                  canOffer && "transition-shadow hover:shadow-md",
                )}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.1),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.08),transparent_38%)]" />

                <div className="relative flex min-h-[10rem]">
                  <div className="flex w-[34%] min-w-[7.5rem] shrink-0 items-center justify-center border-r border-border/60 bg-gradient-to-br from-muted/40 via-background to-primary/[0.06]">
                    <span className="relative flex size-[3.75rem] items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-primary via-primary to-violet-600 text-primary-foreground shadow-[0_12px_30px_-12px_rgba(79,70,229,0.65)] ring-1 ring-white/25">
                      <FileText className="size-8" strokeWidth={1.6} />
                    </span>
                  </div>

                  <div className="relative flex min-w-0 flex-1 flex-col justify-between px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                        {hasStoredLetter && !activeFile ? "Current offer letter" : "Ready to upload"}
                      </p>
                      <p className="mt-1 truncate text-base font-semibold tracking-tight">
                        {displayFileName}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeFile
                          ? `${formatBytes(activeFile.size)} · use the Actions buttons below to save`
                          : hasStoredLetter
                            ? "Saved · view or download anytime"
                            : ""}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {storedViewHref ? (
                        <a
                          href={storedViewHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ size: "sm", variant: "secondary" })}
                        >
                          View letter
                        </a>
                      ) : null}
                      {storedDownloadHref ? (
                        <a
                          href={storedDownloadHref}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          Download
                        </a>
                      ) : null}
                      {canOffer && activeFile ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canSaveLetter}
                            onClick={uploadLetter}
                          >
                            {isPending ? (
                              <Loader2 className="mr-1.5 size-4 animate-spin" />
                            ) : (
                              <UploadCloud className="mr-1.5 size-4" />
                            )}
                            Save offer letter
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!canSaveLetter}
                            onClick={saveAndPushToOnboarding}
                          >
                            {isPending ? (
                              <Loader2 className="mr-1.5 size-4 animate-spin" />
                            ) : (
                              <ListPlus className="mr-1.5 size-4" />
                            )}
                            Save & add to onboarding
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => setUploadedFile(null)}
                          >
                            Clear selection
                          </Button>
                        </>
                      ) : null}
                      {canOffer && hasStoredLetter && !activeFile ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canPushToOnboarding}
                            onClick={pushToOnboarding}
                          >
                            {isPending ? (
                              <Loader2 className="mr-1.5 size-4 animate-spin" />
                            ) : (
                              <ListPlus className="mr-1.5 size-4" />
                            )}
                            {inOnboardingList ? "Update onboarding list" : "Add to onboarding list"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={openFilePicker}
                          >
                            <UploadCloud className="mr-1.5 size-4" />
                            Replace file
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmOpen(true)}
                          >
                            <Trash2 className="mr-1.5 size-4" />
                            Delete
                          </Button>
                        </>
                      ) : null}
                      {canOffer && !hasStoredLetter && !activeFile ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={openFilePicker}
                        >
                          <UploadCloud className="mr-1.5 size-4" />
                          Choose file
                        </Button>
                      ) : null}
                    </div>
                  </div>
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

              <div className="relative flex min-w-0 flex-1 flex-col justify-between px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                    Recruitment
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                    Upload offer letter
                  </h3>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Drag & drop or browse to attach the candidate&apos;s offer letter. Any file type
                    up to {maxSizeLabel}. The file is shared in onboarding only — not emailed.
                  </p>
                </div>

                <div className="mt-3">
                  <span
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium shadow-sm",
                      canOffer && !isPending && "group-hover:border-primary/35 group-hover:bg-primary/[0.04]",
                    )}
                  >
                    <UploadCloud className="size-4 text-primary" />
                    Choose file
                  </span>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t bg-card px-4 py-4 shadow-[0_-4px_24px_-12px_rgba(15,23,42,0.12)]">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Actions
        </p>
        {!canOffer ? (
          <p className="text-sm text-muted-foreground">
            You can view saved letters. Ask an HR admin for offer permissions to upload or add
            candidates to onboarding.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="w-full"
              disabled={!canSaveLetter}
              onClick={uploadLetter}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              <UploadCloud className="mr-2 h-4 w-4" />
              Save offer letter
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={activeFile ? !canSaveLetter : !canPushToOnboarding}
              onClick={activeFile ? saveAndPushToOnboarding : pushToOnboarding}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              <ListPlus className="mr-2 h-4 w-4" />
              {activeFile
                ? "Save & add to onboarding"
                : inOnboardingList
                  ? "Update onboarding list"
                  : "Add to onboarding list"}
            </Button>
          </div>
        )}
        {(storedViewHref || storedDownloadHref) && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {storedViewHref ? (
              <a
                href={storedViewHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
              >
                View saved letter
              </a>
            ) : null}
            {storedDownloadHref ? (
              <a
                href={storedDownloadHref}
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
              >
                Download letter
              </a>
            ) : null}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {inOnboardingList ? (
            <>
              Listed in{" "}
              <Link href={RECRUITMENT_ROUTES.onboarding} className="font-medium text-primary hover:underline">
                Employee Onboarding
              </Link>
            </>
          ) : activeFile ? (
            "File selected — save it, then add to onboarding."
          ) : hasStoredLetter ? (
            "Letter saved — add to onboarding when ready."
          ) : (
            "Choose a file above to get started."
          )}
        </p>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete offer letter?</DialogTitle>
            <DialogDescription>
              This removes the uploaded file for {detail.fullName}. The candidate will no longer
              see it in onboarding until you upload a new letter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={confirmDelete}>
              {isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Delete letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
