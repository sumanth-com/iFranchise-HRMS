"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { exportAuditLogsAction } from "@/lib/audit/actions";
import type { AuditExportFormat } from "@/types/audit";

function downloadBase64(filename: string, mimeType: string, contentBase64: string) {
  const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORT_OPTIONS: { format: AuditExportFormat; label: string }[] = [
  { format: "excel", label: "Excel" },
  { format: "pdf", label: "PDF" },
];

export function AuditExportButtons({
  filters,
  disabled,
}: {
  filters: Record<string, string | undefined>;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingFormat, setPendingFormat] = useState<AuditExportFormat | null>(null);

  function exportAs(format: AuditExportFormat) {
    setPendingFormat(format);
    startTransition(async () => {
      try {
        const res = await exportAuditLogsAction(filters, format);
        if (res.success) {
          downloadBase64(res.filename, res.mimeType, res.contentBase64);
          toast.success(`${format === "pdf" ? "PDF" : "Excel"} downloaded (${res.rowCount} records)`);
        } else {
          toast.error(res.message);
        }
      } catch {
        toast.error(`Failed to download ${format === "pdf" ? "PDF" : "Excel"}`);
      } finally {
        setPendingFormat(null);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {EXPORT_OPTIONS.map(({ format, label }) => {
        const busy = isPending && pendingFormat === format;
        return (
          <Button
            key={format}
            variant="outline"
            size="sm"
            disabled={disabled || isPending}
            onClick={() => exportAs(format)}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
