"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  archiveDocumentAction,
  getDocumentSignedUrlAction,
  verifyDocumentAction,
} from "@/lib/documents/actions";

export function useDocumentFileActions(onDone?: () => void) {
  const [isFilePending, setIsFilePending] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function getSignedUrl(storagePath: string) {
    setIsFilePending(true);
    try {
      const result = await getDocumentSignedUrlAction(storagePath);
      if (!result.success || !result.data) {
        toast.error(result.message ?? "Unable to open file");
        return null;
      }
      return result.data;
    } finally {
      setIsFilePending(false);
    }
  }

  async function download(storagePath: string, fileName?: string) {
    const url = await getSignedUrl(storagePath);
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
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || "document";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success("Download opened");
    }
  }

  async function share(storagePath: string, title: string) {
    const url = await getSignedUrl(storagePath);
    if (!url) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Sharing document: ${title}`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Unable to share document");
    }
  }

  async function openSigned(storagePath: string, mode: "preview" | "download") {
    if (mode === "download") {
      await download(storagePath);
      return;
    }

    const url = await getSignedUrl(storagePath);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function archive(documentId: string) {
    startTransition(async () => {
      const result = await archiveDocumentAction(documentId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Document archived");
      onDone?.();
    });
  }

  function verify(documentId: string, status: "verified" | "rejected") {
    startTransition(async () => {
      const result = await verifyDocumentAction(documentId, status);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(status === "verified" ? "Document verified" : "Document rejected");
      onDone?.();
    });
  }

  return {
    isPending: isPending || isFilePending,
    getSignedUrl,
    openSigned,
    download,
    share,
    archive,
    verify,
  };
}
