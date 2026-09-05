"use client";

import { FileText, UploadCloud } from "lucide-react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

type Props = {
  typeName: string;
  onUpload: () => void;
  className?: string;
  /** Multi-file slots stay available even after uploads. */
  allowMultiple?: boolean;
};

export function DocumentMissingSlotCard({
  typeName,
  onUpload,
  className,
  allowMultiple = false,
}: Props) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[168px] flex-col gap-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 p-3.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileText className="size-5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug [overflow-wrap:anywhere]">
            {typeName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {allowMultiple ? "Select period and upload a file" : "Required · not uploaded yet"}
          </p>
        </div>
      </div>

      <div className="mt-auto flex w-full items-center gap-1.5 text-[11px]">
        <span className="text-muted-foreground">
          {allowMultiple ? "Add another file" : "Upload required"}
        </span>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-2 py-0.5 font-medium",
            allowMultiple
              ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}
        >
          {allowMultiple ? "Available" : "Pending"}
        </span>
      </div>

      <div className="border-t pt-2">
        <Button
          type="button"
          size="sm"
          className="h-8 w-full gap-1.5 text-xs"
          onClick={onUpload}
        >
          <UploadCloud className="size-3.5" />
          Upload
        </Button>
      </div>
    </div>
  );
}
