"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
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

export function AuditExportButtons({
  filters,
  disabled,
}: {
  filters: Record<string, string | undefined>;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function exportAs(format: AuditExportFormat) {
    startTransition(async () => {
      const res = await exportAuditLogsAction(filters, format);
      if (res.success) {
        downloadBase64(res.filename, res.mimeType, res.contentBase64);
        toast.success(`Exported ${res.rowCount} records`);
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(["csv", "excel", "pdf"] as const).map((format) => (
        <Button
          key={format}
          variant="outline"
          size="sm"
          disabled={disabled || isPending}
          onClick={() => exportAs(format)}
        >
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {format.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
