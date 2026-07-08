"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  archiveDocumentAction,
  getDocumentSignedUrlAction,
  verifyDocumentAction,
} from "@/lib/documents/actions";

export function useDocumentFileActions(onDone?: () => void) {
  const [isPending, startTransition] = useTransition();

  function openSigned(storagePath: string, mode: "preview" | "download") {
    startTransition(async () => {
      const result = await getDocumentSignedUrlAction(storagePath);
      if (!result.success || !result.data) {
        toast.error(result.message ?? "Unable to open file");
        return;
      }
      if (mode === "download") {
        const anchor = document.createElement("a");
        anchor.href = result.data;
        anchor.download = "";
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.click();
      } else {
        window.open(result.data, "_blank", "noopener,noreferrer");
      }
    });
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

  return { isPending, openSigned, archive, verify };
}
