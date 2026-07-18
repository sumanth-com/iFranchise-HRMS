"use client";

import { format, parseISO } from "date-fns";
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
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { CATEGORY_META, getFileKind, type FileKind } from "@/components/employee/documents/document-icons";
import { DocumentFileCard } from "@/components/employee/documents/document-file-card";
import { DocumentUploadDialog } from "@/components/employee/documents/document-upload-dialog";
import { DocumentVersionsDialog } from "@/components/employee/documents/document-versions-dialog";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import type { EmployeeDocCategoryKey } from "@/lib/employee/documents/categories";
import {
  employeeDeleteDocumentAction,
  employeeRenameDocumentAction,
} from "@/lib/employee/actions/employee-documents-actions";
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

const KIND_OPTIONS = [
  { value: "all", label: "All file types" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Images" },
  { value: "word", label: "Word" },
  { value: "excel", label: "Excel" },
  { value: "zip", label: "Archives" },
];

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
            ? `Updated ${format(parseISO(folder.lastUpdated), "dd MMM")}`
            : "Empty"}
        </span>
      </div>
    </button>
  );
}

export function DocumentsExplorer({ data }: { data: EmployeeDocumentsExplorerData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [openFolder, setOpenFolder] = useState<EmployeeDocCategoryKey | null>(null);
  const [kind, setKind] = useState("all");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<EmployeeDocFile | null>(null);

  const [versionsFile, setVersionsFile] = useState<EmployeeDocFile | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const [renameFile, setRenameFile] = useState<EmployeeDocFile | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [deleteFile, setDeleteFile] = useState<EmployeeDocFile | null>(null);

  const filteredFiles = useMemo(() => {
    return data.files.filter((file) => {
      if (openFolder && file.categoryKey !== openFolder) return false;
      if (kind !== "all" && getFileKind(file.mimeType, file.fileName) !== (kind as FileKind)) {
        return false;
      }
      return true;
    });
  }, [data.files, openFolder, kind]);

  const recent = useMemo(
    () =>
      [...data.files]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [data.files],
  );

  const storagePct = Math.min(
    100,
    Math.round((data.storage.usedBytes / data.storage.softLimitBytes) * 100),
  );
  const remainingBytes = Math.max(0, data.storage.softLimitBytes - data.storage.usedBytes);

  const folderDefaultType = openFolder
    ? data.documentTypes.find((type) => type.categoryKey === openFolder)?.id
    : undefined;

  function handleRename() {
    if (!renameFile) return;
    const value = renameValue.trim();
    if (!value) {
      toast.error("Please enter a document name");
      return;
    }
    startTransition(async () => {
      const result = await employeeRenameDocumentAction(renameFile.id, value);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Document renamed");
      setRenameFile(null);
      router.refresh();
    });
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

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 rounded-xl border bg-card p-3 shadow-sm">
        <div className="w-40">
          <LabeledSelect items={KIND_OPTIONS} value={kind} onValueChange={setKind} />
        </div>
        <Button
          className="h-9 shrink-0 gap-1.5"
          onClick={() => {
            setReplaceTarget(null);
            setUploadOpen(true);
          }}
        >
          <UploadCloud className="size-4" />
          Upload
        </Button>
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
          <span className="text-xs text-muted-foreground">({filteredFiles.length})</span>
        </div>
      ) : null}

      {/* Content */}
      {openFolder ? (
        filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFiles.map((file) => (
              <DocumentFileCard
                key={file.id}
                file={file}
                onReplace={(target) => {
                  setReplaceTarget(target);
                  setUploadOpen(true);
                }}
                onRename={(target) => {
                  setRenameFile(target);
                  setRenameValue(target.title);
                }}
                onDelete={(target) => setDeleteFile(target)}
                onVersions={(target) => {
                  setVersionsFile(target);
                  setVersionsOpen(true);
                }}
              />
            ))}
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
            <Button
              className="gap-1.5"
              onClick={() => {
                setReplaceTarget(null);
                setUploadOpen(true);
              }}
            >
              <UploadCloud className="size-4" />
              Upload document
            </Button>
          </div>
        )
      ) : (
        <>
          {/* Folder grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.folders.map((folder) => (
              <FolderCard key={folder.key} folder={folder} onOpen={setOpenFolder} />
            ))}
          </div>

          {/* Recent documents */}
          {recent.length > 0 ? (
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-semibold tracking-tight">Recent Documents</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your most recently uploaded files.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((file) => (
                  <DocumentFileCard
                    key={file.id}
                    file={file}
                    onReplace={(target) => {
                      setReplaceTarget(target);
                      setUploadOpen(true);
                    }}
                    onRename={(target) => {
                      setRenameFile(target);
                      setRenameValue(target.title);
                    }}
                    onDelete={(target) => setDeleteFile(target)}
                    onVersions={(target) => {
                      setVersionsFile(target);
                      setVersionsOpen(true);
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        documentTypes={data.documentTypes}
        maxUploadSizeMb={data.maxUploadSizeMb}
        allowedFileTypes={data.allowedFileTypes}
        defaultDocumentTypeId={folderDefaultType}
        replaceTarget={
          replaceTarget
            ? {
                documentId: replaceTarget.id,
                documentTypeId: replaceTarget.documentTypeId,
                title: replaceTarget.title,
              }
            : null
        }
      />

      <DocumentVersionsDialog
        file={versionsFile}
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
      />

      <Modal
        open={Boolean(renameFile)}
        onOpenChange={(next) => !next && setRenameFile(null)}
        title="Rename Document"
        description="Give this document a clearer name."
        contentClassName="sm:max-w-md"
        footer={
          <Button onClick={handleRename} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save
          </Button>
        }
      >
        <Input
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          placeholder="Document name"
          autoFocus
        />
      </Modal>

      <Modal
        open={Boolean(deleteFile)}
        onOpenChange={(next) => !next && setDeleteFile(null)}
        title="Delete Document"
        description={
          deleteFile
            ? `"${deleteFile.title}" will be removed from your documents.`
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
    </div>
  );
}
