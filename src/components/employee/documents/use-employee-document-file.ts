"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { DocumentPreviewTarget } from "@/components/employee/documents/document-preview-dialog";
import {
  employeeDownloadDocumentAction,
  employeeGetDocumentUrlAction,
} from "@/lib/employee/actions/employee-documents-actions";

/** Short-lived signed URL cache so reopen/preview doesn't wait on a new round-trip. */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_TTL_MS = 4 * 60 * 1000; // under typical 1h signed URL; refresh early

function getCachedSignedUrl(storagePath: string): string | null {
  const hit = signedUrlCache.get(storagePath);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    signedUrlCache.delete(storagePath);
    return null;
  }
  return hit.url;
}

function setCachedSignedUrl(storagePath: string, url: string) {
  signedUrlCache.set(storagePath, { url, expiresAt: Date.now() + SIGNED_URL_TTL_MS });
}

export type DocumentFileActions = Pick<
  ReturnType<typeof useEmployeeDocumentFile>,
  "isBusy" | "preview" | "download"
>;

export function useEmployeeDocumentFile() {
  const [isBusy, setIsBusy] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<DocumentPreviewTarget | null>(null);

  async function resolveUrl(storagePath: string) {
    const cached = getCachedSignedUrl(storagePath);
    if (cached) return cached;

    const result = await employeeGetDocumentUrlAction(storagePath);
    if (!result.success || !result.data) {
      toast.error(result.message ?? "Unable to open this file");
      return null;
    }
    setCachedSignedUrl(storagePath, result.data);
    return result.data;
  }

  async function preview(
    storagePath: string,
    fileName: string,
    mimeType: string,
    title?: string,
  ) {
    const cached = getCachedSignedUrl(storagePath);
    // Open shell immediately; fill URL when ready (don't block modal on signed URL).
    setPreviewTarget({
      url: cached,
      fileName,
      mimeType,
      title,
      loading: !cached,
    });

    if (cached) return;

    setIsBusy(true);
    try {
      const url = await resolveUrl(storagePath);
      if (!url) {
        setPreviewTarget(null);
        return;
      }
      setPreviewTarget({ url, fileName, mimeType, title, loading: false });
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
