"use client";

import { CheckCircle2, FileUp, Loader2 } from "lucide-react";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_UPLOAD_MAX_MB } from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

const UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.zip,image/jpeg,image/png,image/webp";

type OnboardingDocumentUploadProps = {
  label: string;
  required?: boolean;
  fileName?: string | null;
  uploading?: boolean;
  pendingFileName?: string | null;
  disabled?: boolean;
  variant?: "default" | "card";
  maxUploadMb?: number;
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
  onSelectFile,
}: OnboardingDocumentUploadProps) {
  const displayName = fileName ?? pendingFileName;
  const isUploaded = Boolean(fileName) && !uploading;
  const uploadHint = `PDF, Word, Excel, images, or ZIP · max ${maxUploadMb} MB`;

  if (variant === "card") {
    return (
      <div className="flex h-full min-h-[168px] flex-col rounded-xl border border-border bg-muted/25 p-4 dark:bg-muted/15">
        <div className="mb-3 text-center">
          <Label className="text-sm font-medium text-foreground">
            {label}
            {required ? <span className="text-foreground"> *</span> : null}
          </Label>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2">
          {displayName ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                isUploaded
                  ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                  : "border-border bg-background/80 text-foreground",
              )}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
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
                accept={UPLOAD_ACCEPT}
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
              <span className="text-xs font-medium text-primary hover:underline">Replace file</span>
              <Input
                type="file"
                accept={UPLOAD_ACCEPT}
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
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 dark:bg-muted/20">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-foreground"> *</span> : null}
      </Label>

      {displayName ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
            isUploaded
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
              : "border-border bg-background/80 text-foreground",
          )}
        >
          {uploading ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {uploading ? "Uploading" : "Uploaded"}
            </p>
            <p className="mt-0.5 truncate font-medium">{displayName}</p>
          </div>
        </div>
      ) : null}

      <Input
        type="file"
        accept={UPLOAD_ACCEPT}
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
