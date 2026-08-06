"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { DocumentPreviewTarget } from "@/components/employee/documents/document-preview-dialog";
import {
  employeeDownloadDocumentAction,
  employeeGetDocumentUrlAction,
} from "@/lib/employee/actions/employee-documents-actions";

export type DocumentFileActions = Pick<
  ReturnType<typeof useEmployeeDocumentFile>,
  "isBusy" | "preview" | "download"
>;

export function useEmployeeDocumentFile() {
  const [isBusy, setIsBusy] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<DocumentPreviewTarget | null>(null);

  async function resolveUrl(storagePath: string) {
    const result = await employeeGetDocumentUrlAction(storagePath);
    if (!result.success || !result.data) {
      toast.error(result.message ?? "Unable to open this file");
      return null;
    }
    return result.data;
  }

  async function preview(
    storagePath: string,
    fileName: string,
    mimeType: string,
    title?: string,
  ) {
    setIsBusy(true);
    try {
      const url = await resolveUrl(storagePath);
      if (!url) return;
      setPreviewTarget({ url, fileName, mimeType, title });
    } finally {
      setIsBusy(false);
    }
  }

  async function download(storagePath: string, fileName: string) {
    setIsBusy(true);
    try {
      const result = await employeeDownloadDocumentAction(storagePath, fileName);
      if (!result.success || !result.data) {
        toast.error(result.message ?? "Unable to download this file");
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = result.data;
      anchor.download = fileName || "document";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success("Download started");
    } finally {
      setIsBusy(false);
    }
  }

  return {
    isBusy,
    preview,
    download,
    previewTarget,
    setPreviewTarget,
  };
}
