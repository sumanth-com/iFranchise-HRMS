"use client";

import { FileText, UploadCloud } from "lucide-react";

import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils";

type Props = {
  typeName: string;
  onUpload: () => void;
  className?: string;
};

export function DocumentMissingSlotCard({ typeName, onUpload, className }: Props) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileText className="size-5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{typeName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Required · not uploaded yet</p>
        </div>
      </div>

      <div className="flex w-full items-center gap-1.5 text-[11px]">
        <span className="text-muted-foreground">Upload required</span>
        <span
          className="ml-auto shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400"
        >
          Pending
        </span>
      </div>

      <div className="border-t pt-2">
        <Button
          type="button"
          size="sm"
          className="h-7 w-full gap-1.5 text-[11px]"
          onClick={onUpload}
        >
          <UploadCloud className="size-3.5" />
          Upload
        </Button>
      </div>
    </div>
  );
}
