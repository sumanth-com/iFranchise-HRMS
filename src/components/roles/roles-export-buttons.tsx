"use client";

import { Download, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { exportRolesDataAction } from "@/lib/roles/actions";
import type { RoleExportFormat } from "@/types/roles";

type Props = {
  entity: "roles" | "assignments";
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function RolesExportButtons({ entity }: Props) {
  const [pendingFormat, setPendingFormat] = useState<RoleExportFormat | null>(null);
  const inFlightRef = useRef(false);

  async function downloadFormat(format: RoleExportFormat) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPendingFormat(format);

    try {
      const res = await exportRolesDataAction(entity, format);
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const payload = res.data;

      if (format === "csv") {
        if (payload.format !== "csv" || !payload.filename.endsWith(".csv")) {
          toast.error("CSV export returned an unexpected file");
          return;
        }
        const blob = new Blob([`\uFEFF${payload.content}`], {
          type: "text/csv;charset=utf-8",
        });
        triggerDownload(blob, payload.filename);
        toast.success("CSV downloaded");
        return;
      }

      if (
        payload.format !== "excel" ||
        !payload.filename.endsWith(".xlsx") ||
        payload.encoding !== "base64"
      ) {
        toast.error("Excel export returned an unexpected file");
        return;
      }

      const bytes = base64ToUint8Array(payload.content);
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      const blob = new Blob([copy], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      triggerDownload(blob, payload.filename);
      toast.success("Excel downloaded");
    } catch {
      toast.error(format === "csv" ? "CSV download failed" : "Excel download failed");
    } finally {
      inFlightRef.current = false;
      setPendingFormat(null);
    }
  }

  const csvPending = pendingFormat === "csv";
  const excelPending = pendingFormat === "excel";
  const busy = pendingFormat !== null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void downloadFormat("csv")}
      >
        {csvPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void downloadFormat("excel")}
      >
        {excelPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Excel
      </Button>
    </div>
  );
}
