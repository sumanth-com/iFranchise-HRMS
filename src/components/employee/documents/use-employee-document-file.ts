"use client";

import { useState } from "react";
import { toast } from "sonner";

import { employeeGetDocumentUrlAction } from "@/lib/employee/actions/employee-documents-actions";

export function useEmployeeDocumentFile() {
  const [isBusy, setIsBusy] = useState(false);

  async function resolveUrl(storagePath: string) {
    const result = await employeeGetDocumentUrlAction(storagePath);
    if (!result.success || !result.data) {
      toast.error(result.message ?? "Unable to open this file");
      return null;
    }
    return result.data;
  }

  async function preview(storagePath: string) {
    setIsBusy(true);
    try {
      const url = await resolveUrl(storagePath);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setIsBusy(false);
    }
  }

  async function download(storagePath: string, fileName: string) {
    setIsBusy(true);
    try {
      const url = await resolveUrl(storagePath);
      if (!url) return;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName || "document";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        toast.success("Download started");
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setIsBusy(false);
    }
  }

  return { isBusy, preview, download };
}
