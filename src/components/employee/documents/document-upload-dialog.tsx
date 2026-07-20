"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CloudUpload, Loader2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { FileThumbnail, getFileExtension } from "@/components/employee/documents/document-icons";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { employeeUploadDocumentAction } from "@/lib/employee/actions/employee-documents-actions";
import type { EmployeeDocumentTypeOption } from "@/types/employee-documents-explorer";
import { cn } from "@/lib/utils";

type ReplaceTarget = {
  documentId: string;
  documentTypeId: string;
  title: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTypes: EmployeeDocumentTypeOption[];
  maxUploadSizeMb: number;
  allowedFileTypes: string[];
  defaultDocumentTypeId?: string;
  replaceTarget?: ReplaceTarget | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  documentTypes,
  maxUploadSizeMb,
  allowedFileTypes,
  defaultDocumentTypeId = "",
  replaceTarget = null,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [documentTypeId, setDocumentTypeId] = useState(defaultDocumentTypeId);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const isReplace = Boolean(replaceTarget);
  const maxBytes = maxUploadSizeMb * 1024 * 1024;
  const acceptAttr = useMemo(
    () => allowedFileTypes.map((ext) => `.${ext}`).join(","),
    [allowedFileTypes],
  );

  useEffect(() => {
    if (!open) return;
    const preferred = replaceTarget?.documentTypeId ?? defaultDocumentTypeId;
    const stillValid = documentTypes.some((type) => type.id === preferred);
    setDocumentTypeId(stillValid ? preferred : (documentTypes[0]?.id ?? ""));
    setTitle(replaceTarget?.title ?? "");
    setFile(null);
    setDragging(false);
  }, [open, defaultDocumentTypeId, replaceTarget, documentTypes]);

  function validateAndSet(next: File | null) {
    if (!next) return;
    const ext = getFileExtension(next.name);
    if (!allowedFileTypes.includes(ext)) {
      toast.error(`.${ext || "?"} files aren't allowed. Use ${allowedFileTypes.join(", ")}.`);
      return;
    }
    if (next.size > maxBytes) {
      toast.error(`"${next.name}" is ${formatBytes(next.size)}. Maximum is ${maxUploadSizeMb} MB.`);
      return;
    }
    setFile(next);
    if (!title.trim()) {
      setTitle(next.name.replace(/\.[^.]+$/, ""));
    }
  }

  function onSubmit() {
    if (!documentTypeId) {
      toast.error("Please choose a document type");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a document name");
      return;
    }
    if (!file) {
      toast.error("Please choose a file to upload");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentTypeId", documentTypeId);
      formData.set("title", title.trim());
      if (replaceTarget) formData.set("replaceDocumentId", replaceTarget.documentId);
      formData.set("file", file);

      const result = await employeeUploadDocumentAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(isReplace ? "New version uploaded" : "Document uploaded");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isReplace ? "Upload New Version" : "Upload Document"}
      description={
        isReplace
          ? "The current file is kept as an earlier version — nothing is overwritten."
          : "Drag & drop a file or browse. Max 20 MB."
      }
      contentClassName="sm:max-w-lg"
      footer={
        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 size-4" />
          )}
          {isReplace ? "Upload Version" : "Upload"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Document Type</Label>
          <LabeledSelect
            items={documentTypes.map((type) => ({ value: type.id, label: type.name }))}
            value={documentTypeId}
            onValueChange={setDocumentTypeId}
            disabled={isPending || isReplace}
            placeholder="Select type"
          />
        </div>

        <div className="space-y-2">
          <Label>Document Name</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isPending}
            placeholder="e.g. Aadhaar Card"
          />
        </div>

        <div className="space-y-2">
          <Label>File</Label>
          <input
            ref={inputRef}
            type="file"
            accept={acceptAttr}
            className="hidden"
            disabled={isPending}
            onChange={(event) => validateAndSet(event.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
              <FileThumbnail
                mimeType={file.type}
                fileName={file.name}
                className="size-10 shrink-0"
                iconClassName="size-5"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                disabled={isPending}
                onClick={() => setFile(null)}
                aria-label="Remove file"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                validateAndSet(event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CloudUpload className="size-5" />
              </span>
              <span className="text-sm font-medium">
                Drag & drop or <span className="text-primary">browse files</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {allowedFileTypes.map((ext) => ext.toUpperCase()).join(", ")} · up to {maxUploadSizeMb} MB
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
