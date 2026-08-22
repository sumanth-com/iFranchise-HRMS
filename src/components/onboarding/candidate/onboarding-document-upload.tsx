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
  onSelectFile: (file: File) => void;
};

export function OnboardingDocumentUpload({
  label,
  required = false,
  fileName,
  uploading = false,
  pendingFileName,
  disabled = false,
  onSelectFile,
}: OnboardingDocumentUploadProps) {
  const displayName = fileName ?? pendingFileName;
  const isUploaded = Boolean(fileName) && !uploading;

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

      <div className="relative">
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
        {!displayName ? (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileUp className="h-3.5 w-3.5" />
            <span>Choose file to upload</span>
          </div>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">
        PDF, Word, Excel, images, or ZIP · max {ONBOARDING_UPLOAD_MAX_MB} MB
      </p>
    </div>
  );
}
