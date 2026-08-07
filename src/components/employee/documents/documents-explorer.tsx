"use client";

import { formatDocumentDate } from "@/lib/employee/documents/document-dates";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  FileStack,
  HardDrive,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { CATEGORY_META } from "@/components/employee/documents/document-icons";
import { DocumentFileCard } from "@/components/employee/documents/document-file-card";
import { DocumentMissingSlotCard } from "@/components/employee/documents/document-missing-slot-card";
import { DocumentPreviewDialog } from "@/components/employee/documents/document-preview-dialog";
import { DocumentUploadDialog } from "@/components/employee/documents/document-upload-dialog";
import { useEmployeeDocumentFile } from "@/components/employee/documents/use-employee-document-file";
import type { EmployeeDocCategoryKey } from "@/lib/employee/documents/categories";
import { employeeDeleteDocumentAction } from "@/lib/employee/actions/employee-documents-actions";
import type {
  EmployeeDocFile,
  EmployeeDocFolder,
  EmployeeDocumentsExplorerData,
} from "@/types/employee-documents-explorer";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FolderCard({
  folder,
  onOpen,
}: {
  folder: EmployeeDocFolder;
  onOpen: (key: EmployeeDocCategoryKey) => void;
}) {
  const meta = CATEGORY_META[folder.key];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(folder.key)}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className={cn("flex size-12 items-center justify-center rounded-xl", meta.bg)}>
          <Icon className={cn("size-6", meta.text)} />
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {folder.count}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight">{folder.name}</p>
        <p className="truncate text-xs text-muted-foreground">{folder.description}</p>
      </div>
      <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
        <span>{formatBytes(folder.storageBytes)}</span>
        <span>
          {folder.lastUpdated
            ? `Updated ${formatDocumentDate(folder.lastUpdated, "dd MMM")}`
            : "Empty"}
        </span>
      </div>
    </button>
  );
}

export function DocumentsExplorer({
  data,
  readOnly = false,
}: {
  data: EmployeeDocumentsExplorerData;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileActions = useEmployeeDocumentFile();

  const [openFolder, setOpenFolder] = useState<EmployeeDocCategoryKey | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<EmployeeDocFile | null>(null);
  const [uploadTypeId, setUploadTypeId] = useState<string | undefined>();

  const [deleteFile, setDeleteFile] = useState<EmployeeDocFile | null>(null);

  const filteredFiles = useMemo(() => {
    if (!openFolder) return data.files;
    return data.files.filter((file) => file.categoryKey === openFolder);
  }, [data.files, openFolder]);

  const storagePct =
    data.storage.softLimitBytes > 0
      ? Math.min(
          100,
          Math.round((data.storage.usedBytes / data.storage.softLimitBytes) * 100),
        )
      : 0;
  const remainingBytes = Math.max(0, data.storage.softLimitBytes - data.storage.usedBytes);

  /** When inside a folder, only offer document types that belong to that category. */
  const uploadDocumentTypes = useMemo(() => {
    if (!openFolder) return data.documentTypes;
    const filtered = data.documentTypes.filter((type) => type.categoryKey === openFolder);
    if (filtered.length > 0) return filtered;
    // Folders without dedicated types (e.g. education / payroll) fall back to "Other"
    return data.documentTypes.filter(
      (type) => type.code.toUpperCase() === "OTHER" || type.categoryKey === "other",
    );
  }, [data.documentTypes, openFolder]);

  const folderDefaultType = uploadDocumentTypes[0]?.id;

  const missingTypes = useMemo(() => {
    if (!openFolder) return [];
    const uploadedTypeIds = new Set(filteredFiles.map((file) => file.documentTypeId));
    return uploadDocumentTypes.filter((type) => !uploadedTypeIds.has(type.id));
  }, [openFolder, filteredFiles, uploadDocumentTypes]);

  function openUpload(typeId?: string) {
    setReplaceTarget(null);
    setUploadTypeId(typeId ?? folderDefaultType);
    setUploadOpen(true);
  }

  function handleDelete() {
    if (!deleteFile) return;
    startTransition(async () => {
      const result = await employeeDeleteDocumentAction(deleteFile.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Document deleted");
      setDeleteFile(null);
      router.refresh();
    });
  }

  const openFolderMeta = openFolder ? data.folders.find((f) => f.key === openFolder) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Storage overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EmployeeStatCard
          label="Documents Uploaded"
          value={String(data.storage.totalFiles)}
          icon={FileStack}
          accent="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <div className="flex h-full min-w-0 flex-col justify-between gap-2 rounded-xl border bg-card p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium leading-snug text-muted-foreground">
              Storage Used
            </p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <HardDrive className="size-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight tabular-nums">
              {formatBytes(data.storage.usedBytes)}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${storagePct}%` }}
              />
            </div>
          </div>
        </div>
        <EmployeeStatCard
          label="Remaining Storage"
          value={formatBytes(remainingBytes)}
          icon={Database}
          accent="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10"
          hint={`of ${formatBytes(data.storage.softLimitBytes)}`}
        />
        <EmployeeStatCard
          label="Largest File"
          value={data.storage.largestFile ? formatBytes(data.storage.largestFile.sizeBytes) : "—"}
          icon={FileStack}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
          hint={data.storage.largestFile?.name}
        />
      </div>

      {/* Breadcrumb when inside a folder */}
      {openFolder ? (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2"
            onClick={() => setOpenFolder(null)}
          >
            <ArrowLeft className="size-4" />
            Folders
          </Button>
          <ChevronRight className="size-4 text-muted-foreground" />
          <span className="font-medium">{openFolderMeta?.name}</span>
          <span className="text-xs text-muted-foreground">
            ({filteredFiles.length} uploaded
            {missingTypes.length > 0 ? ` · ${missingTypes.length} pending` : ""})
          </span>
        </div>
      ) : null}

      {/* Content */}
      {openFolder ? (
        filteredFiles.length > 0 || (!readOnly && missingTypes.length > 0) ? (
          <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFiles.map((file) => (
              <DocumentFileCard
                key={file.id}
                file={file}
                fileActions={fileActions}
                readOnly={readOnly}
                onReplace={(target) => {
                  setReplaceTarget(target);
                  setUploadTypeId(target.documentTypeId);
                  setUploadOpen(true);
                }}
                onDelete={(target) => setDeleteFile(target)}
              />
            ))}
            {!readOnly
              ? missingTypes.map((type) => (
              <DocumentMissingSlotCard
                key={type.id}
                typeName={type.name}
                onUpload={() => openUpload(type.id)}
              />
            ))
              : null}
          </div>
        ) : readOnly ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileStack className="size-7" />
            </span>
            <div>
              <p className="text-sm font-medium">This folder is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No documents in this category yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileStack className="size-7" />
            </span>
            <div>
              <p className="text-sm font-medium">This folder is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload a file to get started.
              </p>
            </div>
            <Button className="gap-1.5" onClick={() => openUpload()}>
              <UploadCloud className="size-4" />
              Upload document
            </Button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.folders.map((folder) => (
            <FolderCard key={folder.key} folder={folder} onOpen={setOpenFolder} />
          ))}
        </div>
      )}

      {!readOnly ? (
        <DocumentUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          documentTypes={uploadDocumentTypes}
          maxUploadSizeMb={data.maxUploadSizeMb}
          allowedFileTypes={data.allowedFileTypes}
          defaultDocumentTypeId={uploadTypeId ?? folderDefaultType}
          replaceTarget={
            replaceTarget
              ? {
                  documentId: replaceTarget.id,
                  documentTypeId: replaceTarget.documentTypeId,
                  title: replaceTarget.documentTypeName,
                }
              : null
          }
        />
      ) : null}

      <DocumentPreviewDialog
        target={fileActions.previewTarget}
        onOpenChange={(next) => !next && fileActions.setPreviewTarget(null)}
      />

      {!readOnly ? (
        <Modal
          open={Boolean(deleteFile)}
          onOpenChange={(next) => !next && setDeleteFile(null)}
          title="Delete Document"
          description={
            deleteFile
              ? `"${deleteFile.documentTypeName}" will be removed from your documents.`
              : undefined
          }
          contentClassName="sm:max-w-md"
          footer={
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Delete
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            Previous versions stay on record with HR. This only removes the file from your
            own document library.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
