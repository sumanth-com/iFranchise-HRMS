"use client";

import { format, parseISO } from "date-fns";
import { Download, Eye, History } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import {
  canPreviewInline,
  FileThumbnail,
  getFileKind,
} from "@/components/employee/documents/document-icons";
import { useEmployeeDocumentFile } from "@/components/employee/documents/use-employee-document-file";
import type { EmployeeDocFile } from "@/types/employee-documents-explorer";

type Props = {
  file: EmployeeDocFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentVersionsDialog({ file, open, onOpenChange }: Props) {
  const { isBusy, preview, download } = useEmployeeDocumentFile();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Version History"
      description={file ? file.title : undefined}
      contentClassName="sm:max-w-lg"
      cancelLabel="Close"
    >
      {file ? (
        <ul className="space-y-2">
          {file.versions.map((version) => {
            const kind = getFileKind(version.mimeType, version.fileName);
            return (
              <li
                key={version.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3"
              >
                <FileThumbnail
                  mimeType={version.mimeType}
                  fileName={version.fileName}
                  className="size-10 shrink-0"
                  iconClassName="size-5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">v{version.version}</p>
                    {version.isCurrent ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatBytes(version.fileSizeBytes)} ·{" "}
                    {format(parseISO(version.createdAt), "dd MMM yyyy, h:mm a")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canPreviewInline(kind) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={isBusy}
                      onClick={() => preview(version.storagePath)}
                      aria-label="Preview version"
                    >
                      <Eye className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isBusy}
                    onClick={() => download(version.storagePath, version.fileName)}
                    aria-label="Download version"
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <History className="size-4" />
          No version history.
        </div>
      )}
    </Modal>
  );
}
