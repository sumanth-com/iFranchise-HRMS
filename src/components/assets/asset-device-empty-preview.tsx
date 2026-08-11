"use client";

import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

export function AssetDeviceEmptyPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[13rem] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      <Package className="size-8 opacity-30" />
      <p>Select an asset above to preview it here</p>
    </div>
  );
}
