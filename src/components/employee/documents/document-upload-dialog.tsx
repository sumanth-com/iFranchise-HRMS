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
import {
  isPeriodPickerDocumentCode,
  isRenameableDocumentCode,
} from "@/lib/employee/documents/categories";
import { DOCUMENT_YEAR_OPTIONS, EMPLOYEE_DOCUMENT_MAX_MB } from "@/lib/documents/storage-paths";
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
  /** When true, document type/name come from the card — hide those fields. */
  lockSlotFields?: boolean;
  replaceTarget?: ReplaceTarget | null;
};

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultYear() {
  const year = String(new Date().getFullYear());
  return (DOCUMENT_YEAR_OPTIONS as readonly string[]).includes(year)
    ? year
    : DOCUMENT_YEAR_OPTIONS[1];
}

function yearOptions() {
  return DOCUMENT_YEAR_OPTIONS.map((value) => ({ value, label: value }));
}

function buildPeriodTitle(code: string, year: string, month: string, customName?: string) {
  const monthLabel = MONTH_OPTIONS.find((item) => item.value === month)?.label ?? month;
  const upper = code.toUpperCase();
  if (upper === "FORM_16") {
    const next = String(Number(year) + 1).slice(-2);
    return `Form 16 · FY ${year}-${next}`;
  }
  if (upper === "TAX_DOCUMENT") {
    const name = customName?.trim() || "Tax Document";
    return `${name} · ${year}`;
  }
  if (upper === "PAYSLIP") return `Payslip · ${monthLabel} ${year}`;
  if (upper === "PREVIOUS_PAYSLIPS") return `Employment Payslip · ${monthLabel} ${year}`;
  return `${monthLabel} ${year}`;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  documentTypes,
  maxUploadSizeMb,
  allowedFileTypes,
  defaultDocumentTypeId = "",
  lockSlotFields = false,
  replaceTarget = null,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [documentTypeId, setDocumentTypeId] = useState(defaultDocumentTypeId);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));

  const isReplace = Boolean(replaceTarget);
  const cappedMaxMb = Math.min(Math.max(1, maxUploadSizeMb), EMPLOYEE_DOCUMENT_MAX_MB);
  const maxBytes = cappedMaxMb * 1024 * 1024;
  const acceptAttr = useMemo(
    () => allowedFileTypes.map((ext) => `.${ext}`).join(","),
    [allowedFileTypes],
  );

  const selectedType = useMemo(
    () => documentTypes.find((type) => type.id === documentTypeId) ?? null,
    [documentTypes, documentTypeId],
  );
  const needsPeriod = isPeriodPickerDocumentCode(selectedType?.code);
  const yearOnly =
    selectedType?.code.toUpperCase() === "FORM_16" ||
    selectedType?.code.toUpperCase() === "TAX_DOCUMENT";
  const needsCustomName =
    isRenameableDocumentCode(selectedType?.code) &&
    (selectedType?.code.toUpperCase() === "TAX_DOCUMENT" ||
      selectedType?.code.toUpperCase().startsWith("OTHER_SLOT") ||
      selectedType?.code.toUpperCase() === "EDUCATION_ADDITIONAL");
  const hideMetaFields = lockSlotFields || isReplace || Boolean(defaultDocumentTypeId);

  useEffect(() => {
    if (!open) return;
    const preferred = replaceTarget?.documentTypeId ?? defaultDocumentTypeId;
    const stillValid = documentTypes.some((type) => type.id === preferred);
    const nextTypeId = stillValid ? preferred : (documentTypes[0]?.id ?? "");
    setDocumentTypeId(nextTypeId);
    const type = documentTypes.find((item) => item.id === nextTypeId);
    // Always use the HRMS document type name — never the raw upload filename.
    setTitle(replaceTarget?.title ?? type?.name ?? "");
    setFile(null);
    setDragging(false);
    setYear(defaultYear());
    setMonth(String(new Date().getMonth() + 1).padStart(2, "0"));
    submitLockRef.current = false;
  }, [open, defaultDocumentTypeId, replaceTarget, documentTypes]);

  useEffect(() => {
    if (!open || isReplace || !selectedType) return;
    if (needsPeriod && selectedType.code.toUpperCase() !== "TAX_DOCUMENT") {
      setTitle(buildPeriodTitle(selectedType.code, year, month));
      return;
    }
    if (needsCustomName && selectedType.code.toUpperCase() === "TAX_DOCUMENT") {
      return;
    }
    if (needsCustomName) {
      return;
    }
    setTitle(selectedType.name);
  }, [open, isReplace, selectedType, needsPeriod, needsCustomName, year, month]);

  function validateAndSet(next: File | null) {
    if (!next) return;
    const ext = getFileExtension(next.name);
    if (!allowedFileTypes.includes(ext)) {
      toast.error(`.${ext || "?"} files aren't allowed. Use ${allowedFileTypes.join(", ")}.`);
      return;
    }
    if (next.size > maxBytes) {
      toast.error(
        `"${next.name}" is ${formatBytes(next.size)}. Maximum file size is ${cappedMaxMb} MB.`,
      );
      return;
    }
    setFile(next);
  }

  function onSubmit() {
    if (isPending || submitLockRef.current) return;
    if (!documentTypeId) {
      toast.error("Please choose a document type");
      return;
    }
    const resolvedTitle =
      needsPeriod && selectedType
        ? buildPeriodTitle(
            selectedType.code,
            year,
            month,
            selectedType.code.toUpperCase() === "TAX_DOCUMENT" ? title : undefined,
          )
        : title.trim() || selectedType?.name || "";
    if (!resolvedTitle) {
      toast.error("Please enter a document name");
      return;
    }
    if (!file) {
      toast.error("Please choose a file to upload");
      return;
    }

    submitLockRef.current = true;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("documentTypeId", documentTypeId);
        formData.set("title", resolvedTitle);
        if (replaceTarget) formData.set("replaceDocumentId", replaceTarget.documentId);
        if (needsPeriod) {
          const issuedDate = yearOnly ? `${year}-04-01` : `${year}-${month}-01`;
          formData.set("issuedDate", issuedDate);
          formData.set(
            "notes",
            yearOnly ? `period:${year}` : `period:${year}-${month}`,
          );
        }
        formData.set("file", file);

        const result = await employeeUploadDocumentAction(formData);
        if (!result.success) {
          toast.error(
            result.message || "Unable to upload the document. Please try again.",
          );
          return;
        }
        toast.success(isReplace ? "New version uploaded" : "Document uploaded");
        onOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Unable to upload the document. Please try again.");
      } finally {
        submitLockRef.current = false;
      }
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isReplace ? "Upload New Version" : selectedType ? `Upload ${selectedType.name}` : "Upload Document"}
      description={
        isReplace
          ? "The current file is kept as an earlier version — nothing is overwritten."
          : needsPeriod
            ? yearOnly
              ? selectedType?.code.toUpperCase() === "TAX_DOCUMENT"
                ? "Select the year, name the document, then choose your file."
                : "Select the financial year, then choose your Form 16 file."
              : "Select the year and month, then choose your file."
            : `Upload your file for ${selectedType?.name ?? "this document"}.`
      }
      contentClassName="sm:max-w-lg"
      footer={
        <Button onClick={onSubmit} disabled={isPending || !file}>
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
        {!hideMetaFields ? (
          <>
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
          </>
        ) : selectedType ? (
          <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Document</p>
            <p className="text-sm font-semibold text-foreground">{selectedType.name}</p>
          </div>
        ) : null}

        {needsCustomName && !isReplace ? (
          <div className="space-y-2">
            <Label>Document name</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isPending}
              placeholder={
                selectedType?.code.toUpperCase() === "TAX_DOCUMENT"
                  ? "e.g. Form 26AS, Investment proof"
                  : "e.g. Training certificate"
              }
            />
          </div>
        ) : null}

        {needsPeriod && !isReplace ? (
          <div className={cn("grid gap-3", yearOnly ? "grid-cols-1" : "grid-cols-2")}>
            <div className="space-y-2">
              <Label>
                {selectedType?.code.toUpperCase() === "FORM_16"
                  ? "Financial year (start)"
                  : "Year"}
              </Label>
              <LabeledSelect
                items={yearOptions()}
                value={year}
                onValueChange={setYear}
                disabled={isPending}
                placeholder="Year"
              />
            </div>
            {!yearOnly ? (
              <div className="space-y-2">
                <Label>Month</Label>
                <LabeledSelect
                  items={MONTH_OPTIONS}
                  value={month}
                  onValueChange={setMonth}
                  disabled={isPending}
                  placeholder="Month"
                />
              </div>
            ) : null}
          </div>
        ) : null}

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
                {allowedFileTypes.map((ext) => ext.toUpperCase()).join(", ")} · up to {cappedMaxMb} MB
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
