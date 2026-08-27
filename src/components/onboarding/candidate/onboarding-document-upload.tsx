"use client";

import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  ONBOARDING_DOCUMENT_ACCEPT,
  ONBOARDING_UPLOAD_MAX_MB,
} from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

type OnboardingDocumentUploadProps = {
  label: string;
  required?: boolean;
  fileName?: string | null;
  uploading?: boolean;
  pendingFileName?: string | null;
  disabled?: boolean;
  variant?: "default" | "card";
  maxUploadMb?: number;
  accept?: string;
  uploadHint?: string;
  reviewStatus?: string | null;
  hrComment?: string | null;
  onSelectFile: (file: File) => void;
};

export function OnboardingDocumentUpload({
  label,
  required = false,
  fileName,
  uploading = false,
  pendingFileName,
  disabled = false,
  variant = "default",
  maxUploadMb = ONBOARDING_UPLOAD_MAX_MB,
  accept = ONBOARDING_DOCUMENT_ACCEPT,
  uploadHint: uploadHintProp,
  reviewStatus,
  hrComment,
  onSelectFile,
}: OnboardingDocumentUploadProps) {
  const displayName = fileName ?? pendingFileName;
  const isUploaded = Boolean(fileName) && !uploading;
  const isCorrectionRequested = reviewStatus === "correction_requested";
  const uploadHint = uploadHintProp ?? `PDF or image only · max ${maxUploadMb} MB`;

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex h-full min-h-[168px] flex-col rounded-xl border p-4 transition-all",
          isCorrectionRequested
            ? "border-amber-400 bg-amber-50/50 shadow-xs ring-1 ring-amber-400/30 dark:border-amber-500/40 dark:bg-amber-950/20"
            : "border-border bg-muted/25 dark:bg-muted/15",
        )}
      >
        <div className="mb-2 flex min-h-[2.5rem] items-center justify-center px-1 text-center">
          <Label className="text-balance text-sm font-medium leading-snug text-foreground">
            {label}
            {required ? <span className="text-foreground"> *</span> : null}
          </Label>
        </div>

        {isCorrectionRequested ? (
          <div className="mb-2.5 rounded-lg border border-amber-300 bg-amber-100/60 p-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-semibold text-amber-950 dark:text-amber-100">
              <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Correction requested by HR</span>
            </div>
            {hrComment ? (
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                {hrComment}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                Please re-upload a clear and valid document.
              </p>
            )}
          </div>
        ) : null}

        <div className="flex flex-1 flex-col justify-center gap-2">
          {displayName ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                isCorrectionRequested
                  ? "border-amber-300 bg-white/90 text-amber-950 dark:border-amber-500/40 dark:bg-muted/60 dark:text-amber-200"
                  : isUploaded
                    ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                    : "border-border bg-background/80 text-foreground",
              )}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : isCorrectionRequested ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <p className="min-w-0 flex-1 truncate text-xs font-medium">{displayName}</p>
            </div>
          ) : (
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background/60 px-3 py-4 text-center transition-colors hover:bg-muted/40",
                (disabled || uploading) && "pointer-events-none opacity-60",
              )}
            >
              <FileUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Choose file</span>
              <Input
                type="file"
                accept={accept}
                disabled={disabled || uploading}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onSelectFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          {displayName && !uploading ? (
            <label className="cursor-pointer text-center">
              <span
                className={cn(
                  "text-xs font-medium underline-offset-2 hover:underline",
                  isCorrectionRequested ? "font-semibold text-amber-700 dark:text-amber-300" : "text-primary",
                )}
              >
                {isCorrectionRequested ? "Upload replacement file" : "Replace file"}
              </span>
              <Input
                type="file"
                accept={accept}
                disabled={disabled || uploading}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onSelectFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          {uploadHint}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border p-4 transition-all",
        isCorrectionRequested
          ? "border-amber-400 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-950/20"
          : "border-border bg-muted/30 dark:bg-muted/20",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="text-foreground"> *</span> : null}
        </Label>
        {isCorrectionRequested ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
            <AlertCircle className="size-3 text-amber-600 dark:text-amber-400" />
            Fix requested
          </span>
        ) : null}
      </div>

      {isCorrectionRequested && hrComment ? (
        <p className="rounded bg-amber-100/60 p-2 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          <strong>HR note:</strong> {hrComment}
        </p>
      ) : null}

      {displayName ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            isCorrectionRequested
              ? "border-amber-300 bg-white/90 text-amber-950 dark:border-amber-500/40 dark:bg-muted/60 dark:text-amber-200"
              : isUploaded
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                : "border-border bg-background/80 text-foreground",
          )}
        >
          {uploading ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : isCorrectionRequested ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {uploading ? "Uploading" : isCorrectionRequested ? "Needs replacement" : "Uploaded"}
            </p>
            <p className="mt-0.5 truncate font-medium">{displayName}</p>
          </div>
        </div>
      ) : null}

      <Input
        type="file"
        accept={accept}
        disabled={disabled || uploading}
        className={cn(
          "h-10 cursor-pointer bg-background text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground dark:bg-background",
          uploading && "opacity-70",
        )}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelectFile(file);
          e.target.value = "";
        }}
      />

      <p className="text-[11px] text-muted-foreground">{uploadHint}</p>
    </div>
  );
}
