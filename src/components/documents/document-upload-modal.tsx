"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { uploadDocumentAction } from "@/lib/documents/actions";
import type { DocumentTypeItem, DocumentsLookups } from "@/types/documents";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: DocumentsLookups;
  defaultEmployeeId?: string;
  replaceDocumentId?: string | null;
  defaultDocumentTypeId?: string;
  defaultTitle?: string;
  lockEmployee?: boolean;
  documentTypes?: DocumentTypeItem[];
};

export function DocumentUploadModal({
  open,
  onOpenChange,
  lookups,
  defaultEmployeeId = "",
  replaceDocumentId = null,
  defaultDocumentTypeId = "",
  defaultTitle = "",
  lockEmployee = false,
  documentTypes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const availableDocumentTypes = documentTypes ?? lookups.documentTypes;
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId);
  const [documentTypeId, setDocumentTypeId] = useState(defaultDocumentTypeId);
  const [title, setTitle] = useState(defaultTitle);
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(defaultEmployeeId);
    const initialTypeId =
      defaultDocumentTypeId &&
      availableDocumentTypes.some((type) => type.id === defaultDocumentTypeId)
        ? defaultDocumentTypeId
        : (availableDocumentTypes[0]?.id ?? "");
    setDocumentTypeId(initialTypeId);
    const initialType = availableDocumentTypes.find((type) => type.id === initialTypeId);
    setTitle(defaultTitle || initialType?.name || "");
    setIssuedDate("");
    setExpiryDate("");
    setNotes("");
    setFile(null);
  }, [open, defaultEmployeeId, defaultDocumentTypeId, defaultTitle, availableDocumentTypes]);

  function resetAndClose(next: boolean) {
    if (!next) {
      setFile(null);
      setNotes("");
    }
    onOpenChange(next);
  }

  function onSubmit() {
    if (!employeeId || !documentTypeId || !title.trim() || !file) {
      toast.error("Employee, type, title, and file are required");
      return;
    }

    const selected = availableDocumentTypes.find((t) => t.id === documentTypeId);
    if (selected?.requiresExpiry && !expiryDate) {
      toast.error("Expiry date is required for this document type");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("employeeId", employeeId);
      formData.set("documentTypeId", documentTypeId);
      formData.set("title", title.trim());
      if (issuedDate) formData.set("issuedDate", issuedDate);
      if (expiryDate) formData.set("expiryDate", expiryDate);
      if (notes.trim()) formData.set("notes", notes.trim());
      if (replaceDocumentId) formData.set("replaceDocumentId", replaceDocumentId);
      formData.set("file", file);

      const result = await uploadDocumentAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(replaceDocumentId ? "Document replaced" : "Document uploaded");
      resetAndClose(false);
      router.refresh();
    });
  }

  const selectedType = availableDocumentTypes.find((t) => t.id === documentTypeId);

  return (
    <Modal
      open={open}
      onOpenChange={resetAndClose}
      title={replaceDocumentId ? "Replace Document" : "Upload Document"}
      description="Upload a file to the employee document folder."
      contentClassName="sm:max-w-lg"
      footer={
        <Button onClick={onSubmit} disabled={isPending || availableDocumentTypes.length === 0}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {replaceDocumentId ? "Replace" : "Upload"}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Employee</Label>
          <EmployeeSelect
            employees={lookups.employees}
            value={employeeId || defaultEmployeeId}
            onValueChange={setEmployeeId}
            disabled={lockEmployee || isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Document Type</Label>
          {availableDocumentTypes.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              All document types in this section are already uploaded.
            </p>
          ) : (
            <LabeledSelect
              items={availableDocumentTypes.map((t) => ({ value: t.id, label: t.name }))}
              value={documentTypeId}
              onValueChange={(value) => {
                setDocumentTypeId(value);
                const type = availableDocumentTypes.find((t) => t.id === value);
                if (type) setTitle(type.name);
              }}
              disabled={isPending}
              placeholder="Select type"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isPending}
            placeholder="Document title"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Issued Date</Label>
            <Input
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Expiry Date{selectedType?.requiresExpiry ? " *" : ""}
            </Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            placeholder="Optional notes"
          />
        </div>
        <div className="space-y-2">
          <Label>File</Label>
          <Input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
            disabled={isPending}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
    </Modal>
  );
}
