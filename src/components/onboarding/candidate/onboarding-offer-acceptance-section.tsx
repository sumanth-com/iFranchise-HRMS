"use client";

import { format, parseISO } from "date-fns";
import {
  Check,
  CloudUpload,
  Download,
  Eye,
  FileText,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Label } from "@/components/ui/label";
import { ONBOARDING_STEP_LABELS } from "@/lib/onboarding/onboarding-step-labels";
import {
  ONBOARDING_SIGNED_OFFER_ACCEPT,
  ONBOARDING_SIGNED_OFFER_UPLOAD_HINT,
} from "@/lib/onboarding/offer-acceptance-constants";
import { ONBOARDING_UPLOAD_MAX_BYTES } from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";
import { ONBOARDING_WIZARD_SECTIONS } from "@/types/onboarding";
import type { CandidatePortalContext, CandidatePortalOfferLetter } from "@/types/onboarding";

type SignedOfferUploadMeta = {
  fileName: string | null;
  uploading: boolean;
  pendingFileName?: string | null;
};

type OnboardingOfferAcceptanceSectionProps = {
  context: CandidatePortalContext;
  completedSteps: number[];
  activeStep: number;
  offerAccepted: boolean;
  onOfferAcceptedChange: (accepted: boolean) => void;
  signedOfferMeta: SignedOfferUploadMeta;
  onUploadSignedOffer: (file: File) => void;
  onViewOfferLetter: () => Promise<void>;
  onDownloadOfferLetter: () => Promise<void>;
};

function formatOfferDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto h-24 w-24">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={radius} className="stroke-muted" strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="stroke-primary transition-all duration-500"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums text-foreground">{percent}%</span>
        <span className="text-[10px] text-muted-foreground">Completed</span>
      </div>
    </div>
  );
}

export function OnboardingOfferAcceptanceSection({
  context,
  completedSteps,
  activeStep,
  offerAccepted,
  onOfferAcceptedChange,
  signedOfferMeta,
  onUploadSignedOffer,
  onViewOfferLetter,
  onDownloadOfferLetter,
}: OnboardingOfferAcceptanceSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [offerActionPending, setOfferActionPending] = useState<"view" | "download" | null>(null);

  const offerLetter: CandidatePortalOfferLetter | null = context.offerLetter;
  const signedUploaded = Boolean(signedOfferMeta.fileName) && !signedOfferMeta.uploading;

  function validatePdf(file: File): boolean {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Signed offer letter must be a PDF file");
      return false;
    }
    if (file.size > ONBOARDING_UPLOAD_MAX_BYTES) {
      toast.error("File must be 10 MB or smaller");
      return false;
    }
    return true;
  }

  function handleFile(file: File | null | undefined) {
    if (!file || !validatePdf(file)) return;
    onUploadSignedOffer(file);
  }

  async function runOfferAction(action: "view" | "download", fn: () => Promise<void>) {
    setOfferActionPending(action);
    try {
      await fn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open offer letter");
    } finally {
      setOfferActionPending(null);
    }
  }

  return (
    <div className="flex min-w-0 w-full flex-col gap-5">
      <div className="w-full rounded-2xl border border-border/80 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Offer Letter & Signature
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Please download the offer letter provided by HR, sign it, and upload the signed copy
              below.
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 w-full gap-5 lg:grid-cols-[minmax(0,1fr)_16.5rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Offer Letter Provided by HR
                    </p>
                    {offerLetter ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        <Check className="h-3 w-3" />
                        Provided by HR
                      </span>
                    ) : null}
                  </div>
                  {offerLetter ? (
                    <>
                      <p className="truncate text-sm text-foreground">{offerLetter.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded on {formatOfferDate(offerLetter.uploadedAt)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Your offer letter will appear here once HR provides it.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!offerLetter || offerActionPending !== null}
                  onClick={() => void runOfferAction("view", onViewOfferLetter)}
                  className="gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  {offerActionPending === "view" ? "Opening…" : "View"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!offerLetter || offerActionPending !== null}
                  onClick={() => void runOfferAction("download", onDownloadOfferLetter)}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  {offerActionPending === "download" ? "Downloading…" : "Download"}
                </Button>
              </div>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">Upload Signed Offer Letter</h3>
              <p className="text-sm text-muted-foreground">
                Upload the signed copy of your offer letter after signing it.
              </p>
            </div>

            <div className="mt-4">
              <div
                className={cn(
                  "flex w-full min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-primary/30 bg-primary/[0.02]",
                  signedOfferMeta.uploading && "pointer-events-none opacity-70",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  handleFile(event.dataTransfer.files?.[0]);
                }}
              >
                {signedUploaded ? (
                  <div className="space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <Check className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {signedOfferMeta.fileName}
                    </p>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace file
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CloudUpload className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">
                      Drag & drop your signed PDF here or
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </Button>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {ONBOARDING_SIGNED_OFFER_UPLOAD_HINT}
                    </p>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ONBOARDING_SIGNED_OFFER_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    handleFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            <label className="mt-4 flex w-full cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/15 p-4">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-primary"
                checked={offerAccepted}
                onChange={(event) => onOfferAcceptedChange(event.target.checked)}
              />
              <span>
                <Label className="cursor-pointer text-sm font-medium text-foreground">
                  I confirm that I have reviewed and signed the offer letter and that the document
                  uploaded above is my signed copy.
                  <span className="text-foreground"> *</span>
                </Label>
              </span>
            </label>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col lg:sticky lg:top-0">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-center text-sm font-semibold text-foreground">Onboarding Progress</p>
            <div className="mt-4 shrink-0">
              <ProgressRing percent={context.completionPercent} />
            </div>
            <ul className="mt-4 space-y-2">
              {ONBOARDING_WIZARD_SECTIONS.map((key, index) => {
                const isComplete = completedSteps.includes(index);
                const isCurrent = index === activeStep;
                return (
                  <li
                    key={key}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs",
                      isCurrent && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        isComplete
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isComplete ? <Check className="h-2.5 w-2.5" /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{ONBOARDING_STEP_LABELS[key]}</p>
                      {isCurrent ? (
                        <p className="text-[10px] text-primary">Current step</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
