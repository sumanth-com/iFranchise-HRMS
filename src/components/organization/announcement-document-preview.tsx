"use client";

import { FileText, ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CompanyAnnouncementAttachment } from "@/types/company-announcement";

function isPdf(file: CompanyAnnouncementAttachment) {
  return (
    file.mimeType === "application/pdf" || file.fileName.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: CompanyAnnouncementAttachment) {
  if (file.mimeType === "image/jpeg" || file.mimeType === "image/png" || file.mimeType === "image/webp") {
    return true;
  }
  if (file.mimeType?.startsWith("image/")) {
    return /\.(png|jpe?g|webp)$/i.test(file.fileName);
  }
  return /\.(png|jpe?g|webp)$/i.test(file.fileName);
}

type PreviewSize = "default" | "large";

export function AnnouncementDocumentPreview({
  attachments,
  size = "default",
  className,
}: {
  attachments: CompanyAnnouncementAttachment[];
  size?: PreviewSize;
  className?: string;
}) {
  if (!attachments?.length) return null;

  const pdfHeight = size === "large" ? "h-[min(58vh,34rem)]" : "h-[22rem]";
  const imageMax = size === "large" ? "max-h-[min(52vh,30rem)]" : "max-h-[20rem]";
  const imageWrap = size === "large" ? "max-h-[min(56vh,32rem)] p-4" : "max-h-[22rem] p-3";

  return (
    <div className={cn("space-y-3", className)}>
      {attachments.map((file) => {
        const pdf = isPdf(file);
        const image = !pdf && isImage(file);
        const canPreview = Boolean(file.url) && (pdf || image);

        return (
          <div key={file.id} className="overflow-hidden rounded-xl border bg-muted/20">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              {image ? (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              )}
              <p className="min-w-0 truncate text-sm font-medium">{file.fileName}</p>
            </div>

            {canPreview && pdf && file.url ? (
              <object
                data={`${file.url}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className={cn("w-full bg-background", pdfHeight)}
              >
                <iframe
                  src={`${file.url}#toolbar=1&navpanes=0`}
                  title={file.fileName}
                  className={cn("w-full bg-background", pdfHeight)}
                />
              </object>
            ) : canPreview && image && file.url ? (
              <div className={cn("flex items-center justify-center bg-muted/10", imageWrap)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.url}
                  alt={file.fileName}
                  className={cn("max-w-full rounded-md object-contain", imageMax)}
                />
              </div>
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {file.url
                  ? "This attachment type can’t be previewed here. Only PDF and image files are shown."
                  : "Attachment preview is temporarily unavailable. Please try again in a moment."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
