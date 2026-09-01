import { FileText } from "lucide-react";

import type { CompanyAnnouncementAttachment } from "@/types/company-announcement";

function isPdf(file: CompanyAnnouncementAttachment) {
  return (
    file.mimeType === "application/pdf" || file.fileName.toLowerCase().endsWith(".pdf")
  );
}

function isImage(file: CompanyAnnouncementAttachment) {
  if (file.mimeType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp)$/i.test(file.fileName);
}

export function AnnouncementDocumentPreview({
  attachments,
}: {
  attachments: CompanyAnnouncementAttachment[];
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-3">
      {attachments.map((file) => (
        <div key={file.id} className="overflow-hidden rounded-xl border bg-muted/20">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <FileText className="size-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{file.fileName}</p>
          </div>
          {file.url && isPdf(file) ? (
            <object
              data={`${file.url}#toolbar=0&navpanes=0`}
              type="application/pdf"
              className="h-[22rem] w-full bg-background"
            >
              <iframe
                src={`${file.url}#toolbar=0&navpanes=0`}
                title={file.fileName}
                className="h-[22rem] w-full bg-background"
              />
            </object>
          ) : file.url && isImage(file) ? (
            <div className="flex max-h-[22rem] items-center justify-center bg-muted/10 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.url}
                alt={file.fileName}
                className="max-h-[20rem] max-w-full rounded-md object-contain"
              />
            </div>
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              {file.fileName} is attached to this announcement and can be reviewed here as part of
              the notice. Preview is available for PDF and image files.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
