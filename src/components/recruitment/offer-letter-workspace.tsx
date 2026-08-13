"use client";

import { FileText, Loader2, Mail, Save, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { createOfferAction } from "@/lib/recruitment/actions";
import { OFFER_STATUS_LABELS } from "@/lib/recruitment/constants";
import {
  applyOfferEmailTemplate,
  buildDefaultOfferEmailSubject,
} from "@/lib/recruitment/offer-email-content";
import {
  assertOfferLetterFile,
  OFFER_LETTER_MAX_BYTES,
} from "@/lib/validations/recruitment";
import { cn } from "@/lib/utils";
import type { CandidateDetail, OfferEmailDefaults } from "@/types/recruitment";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type OfferLetterWorkspaceProps = {
  detail: CandidateDetail | null;
  loading: boolean;
  canOffer: boolean;
  offerEmailDefaults: OfferEmailDefaults;
  onClose: () => void;
  onRefresh: () => void;
};

export function OfferLetterWorkspace({
  detail,
  loading,
  canOffer,
  offerEmailDefaults,
  onClose,
  onRefresh,
}: OfferLetterWorkspaceProps) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const latestOffer = detail?.offers[0];
  const hasStoredLetter = Boolean(latestOffer?.offerLetterPath);
  const storedFileName = latestOffer?.offerLetterPath?.split("/").pop() ?? "Saved offer letter";
  const activeFile = uploadedFile;
  const activeFileLabel = activeFile?.name ?? (hasStoredLetter ? storedFileName : null);
  const canPreviewPdf =
    activeFile?.type === "application/pdf" ||
    (hasStoredLetter && !activeFile && latestOffer?.offerLetterPath?.toLowerCase().endsWith(".pdf"));

  const defaultSubject = useMemo(() => {
    if (!detail) return "";
    return buildDefaultOfferEmailSubject(detail.jobTitle, offerEmailDefaults.subjectTemplate);
  }, [detail, offerEmailDefaults.subjectTemplate]);

  const defaultMessage = useMemo(() => {
    if (!detail) return "";
    return applyOfferEmailTemplate(offerEmailDefaults.messageTemplate, {
      candidateName: detail.fullName,
      position: detail.jobTitle,
      hrEmail: offerEmailDefaults.hrEmail,
      hrPhone: offerEmailDefaults.hrPhone,
    });
  }, [detail, offerEmailDefaults]);

  useEffect(() => {
    if (!detail) return;
    const existing = detail.offers[0];
    setEmailSubject(existing?.emailSubject ?? defaultSubject);
    setEmailMessage(existing?.emailMessage ?? defaultMessage);
    setUploadedFile(null);
    setPreviewUrl(null);
    setDragging(false);
  }, [detail?.id, detail, defaultSubject, defaultMessage]);

  useEffect(() => {
    if (!activeFile) {
      setPreviewUrl(null);
      return;
    }

    if (activeFile.type === "application/pdf") {
      const url = URL.createObjectURL(activeFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setPreviewUrl(null);
  }, [activeFile]);

  useEffect(() => {
    if (!latestOffer?.id || activeFile || !hasStoredLetter || !canPreviewPdf) return;

    setPreviewUrl(`/api/recruitment/offers/${latestOffer.id}/pdf`);
  }, [latestOffer?.id, activeFile, hasStoredLetter, canPreviewPdf]);

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

  function submit(sendNow: boolean) {
    if (!detail || !canOffer) return;
    if (!emailSubject.trim()) {
      toast.error("Email subject is required");
      return;
    }
    if (!emailMessage.trim()) {
      toast.error("Email message is required");
      return;
    }
    if (!uploadedFile && !hasStoredLetter) {
      toast.error("Upload an offer letter before saving");
      return;
    }

    const formData = new FormData();
    formData.set("candidateId", detail.id);
    formData.set("emailSubject", emailSubject.trim());
    formData.set("emailMessage", emailMessage.trim());
    formData.set("sendNow", sendNow ? "true" : "false");
    if (uploadedFile) {
      formData.set("offerFile", uploadedFile);
    }

    startTransition(async () => {
      const result = await createOfferAction(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        sendNow
          ? latestOffer?.offerStatus === "sent"
            ? "Offer letter resent to candidate email"
            : "Offer letter sent to candidate email"
          : "Offer letter saved",
      );
      onRefresh();
    });
  }

  const canSend =
    canOffer &&
    detail &&
    (!detail.offers.length ||
      detail.offers[0].offerStatus === "draft" ||
      detail.offers[0].offerStatus === "sent");
  const sendLabel =
    latestOffer?.offerStatus === "sent" ? "Resend offer" : "Send offer";
  const maxSizeLabel = formatBytes(OFFER_LETTER_MAX_BYTES);

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
          Choose someone from the list to upload their offer letter and send it by email.
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
            {detail.jobTitle} · {detail.email}
            {latestOffer ? ` · ${OFFER_STATUS_LABELS[latestOffer.offerStatus]}` : ""}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2">
          <Label>Email subject</Label>
          <Input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            disabled={isPending || !canOffer}
            placeholder={defaultSubject}
          />
        </div>

        <div className="space-y-2">
          <Label>Email message</Label>
          <textarea
            className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            disabled={isPending || !canOffer}
            placeholder={defaultMessage}
          />
          <p className="text-xs text-muted-foreground">
            Sent to {detail.email} with the offer letter attached.
          </p>
        </div>

        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={isPending || !canOffer}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {activeFileLabel ? (
            <div className="space-y-3">
              <div
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-card shadow-sm",
                  canOffer && "transition-shadow hover:shadow-md",
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.1),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.08),transparent_38%)]"
                />

                <div className="relative flex min-h-[10rem]">
                  <div className="flex w-[34%] min-w-[7.5rem] shrink-0 items-center justify-center border-r border-border/60 bg-gradient-to-br from-muted/40 via-background to-primary/[0.06]">
                    <div className="relative flex items-center justify-center">
                      <span
                        className="absolute size-[4.5rem] rounded-full bg-emerald-500/15 blur-2xl"
                        aria-hidden
                      />
                      <span
                        className="relative flex size-[3.75rem] items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-primary via-primary to-violet-600 text-primary-foreground shadow-[0_12px_30px_-12px_rgba(79,70,229,0.65)] ring-1 ring-white/25"
                      >
                        <FileText className="size-8" strokeWidth={1.6} />
                      </span>
                    </div>
                  </div>

                  <div className="relative flex min-w-0 flex-1 flex-col justify-between px-4 py-4 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                        Offer letter ready
                      </p>
                      <p className="mt-1 truncate text-base font-semibold tracking-tight">
                        {activeFileLabel}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {activeFile
                          ? `${formatBytes(activeFile.size)} · attached when you send`
                          : "Saved offer letter · attached when you send"}
                      </p>
                    </div>

                    {canOffer ? (
                      <div className="mt-3 flex flex-wrap gap-2">
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
                        {activeFile ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => setUploadedFile(null)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {previewUrl && canPreviewPdf ? (
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <iframe
                    title="Offer letter preview"
                    src={previewUrl}
                    className="h-[min(360px,45vh)] w-full"
                  />
                </div>
              ) : activeFileLabel ? (
                <p className="text-xs text-muted-foreground">
                  {activeFile?.type === "application/pdf" ||
                  activeFileLabel.toLowerCase().endsWith(".pdf")
                    ? "PDF preview is shown above when available."
                    : "Preview is available for PDF files. Any file type up to 10 MB can still be emailed."}
                </p>
              ) : null}
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
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.12),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.08),transparent_38%)]"
              />

              <div className="relative flex w-[38%] min-w-[8.5rem] shrink-0 items-center justify-center border-r border-border/60 bg-gradient-to-br from-muted/40 via-background to-primary/[0.06]">
                <div className="relative flex items-center justify-center">
                  <span
                    className="absolute size-[5.5rem] rounded-full bg-primary/15 blur-2xl"
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "relative flex size-[4.75rem] items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-primary via-primary to-violet-600 text-primary-foreground shadow-[0_12px_30px_-12px_rgba(79,70,229,0.65)] ring-1 ring-white/25",
                      canOffer && !isPending && "transition-transform duration-300 group-hover:scale-[1.02]",
                    )}
                  >
                    <UploadCloud className="size-[2.1rem]" strokeWidth={1.6} />
                  </span>
                </div>
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
                    up to {maxSizeLabel} — it will be emailed when you send the offer.
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

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/10 px-4 py-3">
        {canOffer ? (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => submit(false)}>
            {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            <Save className="mr-1 h-3.5 w-3.5" />
            Save
          </Button>
        ) : null}
        {canSend ? (
          <Button size="sm" disabled={isPending} onClick={() => submit(true)}>
            {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            <Mail className="mr-1 h-3.5 w-3.5" />
            {sendLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
