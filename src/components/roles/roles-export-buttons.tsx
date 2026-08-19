"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { exportRolesDataAction } from "@/lib/roles/actions";
import type { RoleExportFormat } from "@/types/roles";

type Props = {
  entity: "roles" | "assignments";
};

type PendingType = RoleExportFormat | "pdf" | null;

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

function csvToPdfBlob(csvContent: string, title: string): Blob {
  const lines = csvContent.trim().split("\n");
  const headers = lines[0]?.split(",").map((h) => h.replace(/^"|"$/g, "")) ?? [];
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((cell) => cell.replace(/^"|"$/g, "")),
  );

  let html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
      h1 { font-size: 16px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }
    </style></head><body>
    <h1>${title}</h1><table><thead><tr>`;
  for (const h of headers) html += `<th>${h}</th>`;
  html += `</tr></thead><tbody>`;
  for (const row of rows) {
    html += `<tr>`;
    for (const cell of row) html += `<td>${cell}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table></body></html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return new Blob([html], { type: "text/html" });
}

export function RolesExportButtons({ entity }: Props) {
  const [pendingFormat, setPendingFormat] = useState<PendingType>(null);
  const inFlightRef = useRef(false);

  async function downloadExcel() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPendingFormat("excel");

    try {
      const res = await exportRolesDataAction(entity, "excel");
      if (!res.success) { toast.error(res.message); return; }
      const payload = res.data;
      if (payload.format !== "excel" || !payload.filename.endsWith(".xlsx") || payload.encoding !== "base64") {
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
      toast.error("Excel download failed");
    } finally {
      inFlightRef.current = false;
      setPendingFormat(null);
    }
  }

  async function downloadPdf() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setPendingFormat("pdf");

    try {
      const res = await exportRolesDataAction(entity, "csv");
      if (!res.success) { toast.error(res.message); return; }
      const payload = res.data;
      if (payload.format !== "csv") { toast.error("Export failed"); return; }
      const title = entity === "roles" ? "Roles Export" : "User Role Assignments";
      csvToPdfBlob(payload.content, title);
      toast.success("PDF ready — use your browser print dialog to save");
    } catch {
      toast.error("PDF generation failed");
    } finally {
      inFlightRef.current = false;
      setPendingFormat(null);
    }
  }

  const excelPending = pendingFormat === "excel";
  const pdfPending = pendingFormat === "pdf";
  const busy = pendingFormat !== null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void downloadExcel()}
      >
        {excelPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        Excel
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void downloadPdf()}
      >
        {pdfPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
        PDF
      </Button>
    </div>
  );
}
