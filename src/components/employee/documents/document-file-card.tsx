"use client";

import { formatDocumentDate } from "@/lib/employee/documents/document-dates";
import {
  Download,
  Eye,
  Lock,
  MoreVertical,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  canPreviewInline,
  FileThumbnail,
  fileKindLabel,
  getFileKind,
} from "@/components/employee/documents/document-icons";
import type { DocumentFileActions } from "@/components/employee/documents/use-employee-document-file";
import {
  getEmployeeDocumentStatusClass,
  getEmployeeDocumentStatusLabel,
} from "@/lib/employee/documents/document-status";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EmployeeDocFile } from "@/types/employee-documents-explorer";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  file: EmployeeDocFile;
  fileActions: DocumentFileActions;
  onReplace: (file: EmployeeDocFile) => void;
  onDelete: (file: EmployeeDocFile) => void;
  readOnly?: boolean;
};

export function DocumentFileCard({
  file,
  fileActions,
  onReplace,
  onDelete,
  readOnly = false,
}: Props) {
  const { isBusy, preview, download } = fileActions;
  const kind = getFileKind(file.mimeType, file.fileName);
  const previewable = canPreviewInline(kind);
  const displayName = file.documentTypeName;
  const previewTitle = displayName;

  return (
    <div className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <FileThumbnail
          mimeType={file.mimeType}
          fileName={file.fileName}
          className="size-11 shrink-0"
          iconClassName="size-5"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={displayName}>
            {displayName}
          </p>
        </div>

        {!readOnly && !file.isReadOnly ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 opacity-70 group-hover:opacity-100"
                  aria-label="Document actions"
                >
                  <MoreVertical className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onReplace(file)}>
                <Upload className="size-4" />
                Reupload
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(file)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="flex w-full items-center gap-1.5 text-[11px]">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
            {fileKindLabel(kind)}
          </span>
          <span className="text-muted-foreground">{formatBytes(file.fileSizeBytes)}</span>
          {file.versionCount > 1 ? (
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
              v{file.versionCount}
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-2 py-0.5 font-medium",
            getEmployeeDocumentStatusClass(file.status),
          )}
        >
          {file.isReadOnly ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" />
              {getEmployeeDocumentStatusLabel(file.status)}
            </span>
          ) : (
            getEmployeeDocumentStatusLabel(file.status)
          )}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground">
        <span>{formatDocumentDate(file.createdAt, "dd MMM yyyy")}</span>
        <div className="flex items-center gap-1">
          {previewable ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px]"
              disabled={isBusy}
              onClick={() =>
                preview(file.storagePath, file.fileName, file.mimeType, previewTitle)
              }
            >
              <Eye className="size-3" />
              Preview
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px]"
            disabled={isBusy}
            onClick={() => download(file.storagePath, file.fileName)}
          >
            <Download className="size-3" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
