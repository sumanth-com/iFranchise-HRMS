"use client";

import { format, parseISO } from "date-fns";
import {
  Download,
  Eye,
  History,
  Lock,
  MoreVertical,
  Pencil,
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
import { useEmployeeDocumentFile } from "@/components/employee/documents/use-employee-document-file";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentStatus } from "@/types/documents";
import type { EmployeeDocFile } from "@/types/employee-documents-explorer";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<DocumentStatus, string> = {
  verified: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400",
  expired: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  file: EmployeeDocFile;
  onReplace: (file: EmployeeDocFile) => void;
  onRename: (file: EmployeeDocFile) => void;
  onDelete: (file: EmployeeDocFile) => void;
  onVersions: (file: EmployeeDocFile) => void;
};

export function DocumentFileCard({ file, onReplace, onRename, onDelete, onVersions }: Props) {
  const { isBusy, preview, download } = useEmployeeDocumentFile();
  const kind = getFileKind(file.mimeType, file.fileName);
  const previewable = canPreviewInline(kind);

  return (
    <div className="group flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <FileThumbnail
          mimeType={file.mimeType}
          fileName={file.fileName}
          className="size-11 shrink-0"
          iconClassName="size-5"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={file.title}>
            {file.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{file.documentTypeName}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 opacity-70 group-hover:opacity-100"
                nativeButton={false}
                aria-label="Document actions"
              >
                <MoreVertical className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            {previewable ? (
              <DropdownMenuItem disabled={isBusy} onClick={() => preview(file.storagePath)}>
                <Eye className="size-4" />
                Preview
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              disabled={isBusy}
              onClick={() => download(file.storagePath, file.fileName)}
            >
              <Download className="size-4" />
              Download
            </DropdownMenuItem>
            {file.versionCount > 1 ? (
              <DropdownMenuItem onClick={() => onVersions(file)}>
                <History className="size-4" />
                Version history
              </DropdownMenuItem>
            ) : null}

            {file.isReadOnly ? null : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onReplace(file)}>
                  <Upload className="size-4" />
                  Upload new version
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRename(file)}>
                  <Pencil className="size-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(file)}>
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
          {fileKindLabel(kind)}
        </span>
        <span className="text-muted-foreground">{formatBytes(file.fileSizeBytes)}</span>
        {file.versionCount > 1 ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
            v{file.versionCount}
          </span>
        ) : null}
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 font-medium capitalize",
            STATUS_STYLES[file.status],
          )}
        >
          {file.isReadOnly ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" />
              {file.status}
            </span>
          ) : (
            file.status
          )}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground">
        <span>{format(parseISO(file.createdAt), "dd MMM yyyy")}</span>
        <div className="flex items-center gap-1">
          {previewable ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px]"
              disabled={isBusy}
              onClick={() => preview(file.storagePath)}
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
