"use client";

import { Loader2 } from "lucide-react";

import { Modal } from "@/components/common/modal";
import {
  canPreviewInline,
  getFileKind,
} from "@/components/employee/documents/document-icons";

export type DocumentPreviewTarget = {
  /** Null while the signed URL is still resolving. */
  url: string | null;
  fileName: string;
  mimeType: string;
  title?: string;
  loading?: boolean;
};

type Props = {
  target: DocumentPreviewTarget | null;
  onOpenChange: (open: boolean) => void;
};

export function DocumentPreviewDialog({ target, onOpenChange }: Props) {
  const open = Boolean(target);
  const kind = target ? getFileKind(target.mimeType, target.fileName) : "file";
  const canInline = target ? canPreviewInline(kind) : false;
  const isLoading = Boolean(target?.loading || (target && !target.url && canInline));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={target?.title ?? target?.fileName ?? "Document preview"}
      description={target?.fileName}
      contentClassName="sm:max-w-4xl"
      cancelLabel="Close"
      showCancel
    >
      {target ? (
        canInline ? (
          <div className="flex min-h-[min(70vh,640px)] items-center justify-center rounded-lg border bg-muted/20">
            {isLoading || !target.url ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading preview…
              </div>
            ) : kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL preview
              <img
                src={target.url}
                alt={target.title ?? target.fileName}
                className="max-h-[min(68vh,600px)] max-w-full rounded-md object-contain"
              />
            ) : (
              <iframe
                title={target.fileName}
                src={target.url}
                className="h-[min(68vh,600px)] w-full rounded-md bg-white"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <p>Preview is not available for this file type.</p>
            <p className="text-xs">Use Download to save the file to your device.</p>
          </div>
        )
      ) : null}
    </Modal>
  );
}
