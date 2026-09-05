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

import { Button, POLICY_HEADER_BUTTON_CLASS } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { CATEGORY_META } from "@/components/employee/documents/document-icons";
import { DocumentFileCard } from "@/components/employee/documents/document-file-card";
import { DocumentMissingSlotCard } from "@/components/employee/documents/document-missing-slot-card";
import { DocumentPreviewDialog } from "@/components/employee/documents/document-preview-dialog";
import { DocumentUploadDialog } from "@/components/employee/documents/document-upload-dialog";
import { useEmployeeDocumentFile } from "@/components/employee/documents/use-employee-document-file";
import {
  isMultiFileDocumentCode,
  PAYROLL_NESTED_FOLDERS,
  type EmployeeDocCategoryKey,
  type PayrollNestedCode,
} from "@/lib/employee/documents/categories";
import { employeeDeleteDocumentAction } from "@/lib/employee/actions/employee-documents-actions";
import type {
  EmployeeDocFile,
  EmployeeDocFolder,
  EmployeeDocumentTypeOption,
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

function displayNameForDelete(file: EmployeeDocFile) {
  if (isMultiFileDocumentCode(file.documentTypeCode) || file.title?.trim()) {
    return file.title?.trim() || file.documentTypeName;
  }
  return file.documentTypeName;
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
      className="group flex h-full min-h-[148px] flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", meta.bg)}>
          <Icon className={cn("size-5", meta.text)} />
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {folder.count}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug tracking-tight">{folder.name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{folder.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
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

function PayrollSubFolderCard({
  name,
  description,
  count,
  onOpen,
}: {
  name: string;
  description: string;
  count: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
          <FileStack className="size-5 text-violet-600" />
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug tracking-tight">{name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="mt-auto border-t pt-2 text-[11px] font-medium text-violet-600">
        Open folder →
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
  const [payrollSub, setPayrollSub] = useState<PayrollNestedCode | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<EmployeeDocFile | null>(null);
  const [uploadTypeId, setUploadTypeId] = useState<string | undefined>();

  const [deleteFile, setDeleteFile] = useState<EmployeeDocFile | null>(null);

  const storagePct =
    data.storage.softLimitBytes > 0
      ? Math.min(
          100,
          Math.round((data.storage.usedBytes / data.storage.softLimitBytes) * 100),
        )
      : 0;
  const remainingBytes = Math.max(0, data.storage.softLimitBytes - data.storage.usedBytes);

  const categoryTypes = useMemo(() => {
    if (!openFolder) return data.documentTypes;
    return data.documentTypes.filter((type) => type.categoryKey === openFolder);
  }, [data.documentTypes, openFolder]);

  const activeType: EmployeeDocumentTypeOption | null = useMemo(() => {
    if (!openFolder) return null;
    if (openFolder === "payroll" && payrollSub) {
      return categoryTypes.find((type) => type.code.toUpperCase() === payrollSub) ?? null;
    }
    return null;
  }, [openFolder, payrollSub, categoryTypes]);

  const filteredFiles = useMemo(() => {
    if (!openFolder) return [];
    const inCategory = data.files.filter((file) => file.categoryKey === openFolder);
    if (openFolder === "payroll") {
      if (!payrollSub) return [];
      return inCategory.filter(
        (file) => file.documentTypeCode.toUpperCase() === payrollSub,
      );
    }
    return inCategory;
  }, [data.files, openFolder, payrollSub]);

  const missingTypes = useMemo(() => {
    if (!openFolder || openFolder === "payroll") return [];
    const uploadedTypeIds = new Set(filteredFiles.map((file) => file.documentTypeId));
    return categoryTypes.filter((type) => {
      if (isMultiFileDocumentCode(type.code)) return true;
      return !uploadedTypeIds.has(type.id);
    });
  }, [openFolder, filteredFiles, categoryTypes]);

  const pendingSlotCount = useMemo(() => {
    if (!openFolder || openFolder === "payroll") return 0;
    const uploadedTypeIds = new Set(
      data.files
        .filter((file) => file.categoryKey === openFolder)
        .map((file) => file.documentTypeId),
    );
    return categoryTypes.filter((type) => {
      if (isMultiFileDocumentCode(type.code)) return false;
      return !uploadedTypeIds.has(type.id);
    }).length;
  }, [openFolder, data.files, categoryTypes]);

  const payrollCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const folder of PAYROLL_NESTED_FOLDERS) {
      map[folder.code] = data.files.filter(
        (file) =>
          file.categoryKey === "payroll" &&
          file.documentTypeCode.toUpperCase() === folder.code,
      ).length;
    }
    return map;
  }, [data.files]);

  const uploadDocumentTypes = useMemo(() => {
    if (openFolder === "payroll" && activeType) return [activeType];
    if (openFolder) return categoryTypes;
    return data.documentTypes;
  }, [openFolder, activeType, categoryTypes, data.documentTypes]);

  const folderDefaultType = uploadDocumentTypes[0]?.id;
  const openFolderMeta = openFolder ? data.folders.find((f) => f.key === openFolder) : null;
  const payrollSubMeta = payrollSub
    ? PAYROLL_NESTED_FOLDERS.find((item) => item.code === payrollSub)
    : null;

  function openCategory(key: EmployeeDocCategoryKey) {
    setOpenFolder(key);
    setPayrollSub(null);
  }

  function backFromFolder() {
    if (openFolder === "payroll" && payrollSub) {
      setPayrollSub(null);
      return;
    }
    setOpenFolder(null);
    setPayrollSub(null);
  }

  function openUpload(typeId?: string) {
    setReplaceTarget(null);
    setUploadTypeId(typeId ?? activeType?.id ?? folderDefaultType);
    setUploadOpen(true);
  }

  function handleDelete() {
    if (!deleteFile || isPending) return;
    startTransition(async () => {
      try {
        const result = await employeeDeleteDocumentAction(deleteFile.id);
        if (!result.success) {
          toast.error(result.message || "Unable to delete the document. Please try again.");
          return;
        }
        toast.success("Document deleted");
        setDeleteFile(null);
        router.refresh();
      } catch {
        toast.error("Unable to delete the document. Please try again.");
      }
    });
  }

  const showingPayrollHub = openFolder === "payroll" && !payrollSub;
  const showingNestedList =
    Boolean(openFolder) && (openFolder !== "payroll" || Boolean(payrollSub));

  return (
    <div className="flex flex-col gap-4">
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

      {openFolder ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            className={cn(POLICY_HEADER_BUTTON_CLASS, "h-7 gap-1 px-2 text-black hover:text-black")}
            onClick={backFromFolder}
          >
            <ArrowLeft className="size-4 text-black" />
            {payrollSub ? "Payroll & Tax" : "Folders"}
          </Button>
          <ChevronRight className="size-4 text-muted-foreground" />
          {payrollSub ? (
            <>
              <button
                type="button"
                className="font-medium text-foreground hover:underline"
                onClick={() => setPayrollSub(null)}
              >
                {openFolderMeta?.name}
              </button>
              <ChevronRight className="size-4 text-muted-foreground" />
              <span className="font-medium">{payrollSubMeta?.name}</span>
              <span className="text-xs text-muted-foreground">
                ({filteredFiles.length} uploaded)
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">{openFolderMeta?.name}</span>
              <span className="text-xs text-muted-foreground">
                {showingPayrollHub
                  ? `(${data.folders.find((f) => f.key === "payroll")?.count ?? 0} uploaded)`
                  : `(${filteredFiles.length} uploaded${
                      pendingSlotCount > 0 ? ` · ${pendingSlotCount} pending` : ""
                    })`}
              </span>
            </>
          )}
        </div>
      ) : null}

      {!openFolder ? (
        <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {data.folders.map((folder) => (
            <FolderCard key={folder.key} folder={folder} onOpen={openCategory} />
          ))}
        </div>
      ) : null}

      {showingPayrollHub ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-3">
          {PAYROLL_NESTED_FOLDERS.map((folder) => (
            <PayrollSubFolderCard
              key={folder.code}
              name={folder.name}
              description={folder.description}
              count={payrollCounts[folder.code] ?? 0}
              onOpen={() => setPayrollSub(folder.code)}
            />
          ))}
        </div>
      ) : null}

      {showingNestedList ? (
        <>
          {!readOnly && openFolder === "payroll" && activeType ? (
            <div className="flex justify-end">
              <Button className="gap-1.5" onClick={() => openUpload(activeType.id)}>
                <UploadCloud className="size-4" />
                Upload {payrollSubMeta?.name === "Payslips" ? "Payslip" : payrollSubMeta?.name?.replace(/s$/, "") ?? "document"}
              </Button>
            </div>
          ) : null}

          {filteredFiles.length > 0 || (!readOnly && missingTypes.length > 0) ? (
            <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                      allowMultiple={isMultiFileDocumentCode(type.code)}
                      onUpload={() => openUpload(type.id)}
                    />
                  ))
                : null}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileStack className="size-6" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  {openFolder === "payroll" ? `No ${payrollSubMeta?.name?.toLowerCase() ?? "documents"} yet` : "This folder is empty"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {readOnly
                    ? "No documents in this category yet."
                    : "Upload a file to get started."}
                </p>
              </div>
              {!readOnly ? (
                <Button className="gap-1.5" onClick={() => openUpload()}>
                  <UploadCloud className="size-4" />
                  Upload
                </Button>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      {!readOnly ? (
        <DocumentUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          documentTypes={uploadDocumentTypes}
          maxUploadSizeMb={data.maxUploadSizeMb}
          allowedFileTypes={data.allowedFileTypes}
          defaultDocumentTypeId={uploadTypeId ?? folderDefaultType}
          lockSlotFields
          replaceTarget={
            replaceTarget
              ? {
                  documentId: replaceTarget.id,
                  documentTypeId: replaceTarget.documentTypeId,
                  title: replaceTarget.title || replaceTarget.documentTypeName,
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
              ? `Are you sure you want to delete "${displayNameForDelete(deleteFile)}"?`
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
              Delete Document
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
