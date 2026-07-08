"use client";

import { format } from "date-fns";
import {
  Archive,
  Download,
  Eye,
  FileUp,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { DocumentUploadModal } from "@/components/documents/document-upload-modal";
import { useDocumentFileActions } from "@/components/documents/use-document-actions";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENTS_ROUTES,
  canDeleteDocuments,
  canEditDocuments,
  canUploadDocuments,
} from "@/lib/documents/constants";
import { formatBytes } from "@/lib/documents/services/documents-utils";
import type {
  DocumentsLookups,
  EmployeeDocumentItem,
  EmployeeDocumentListResult,
} from "@/types/documents";

type Props = {
  result: EmployeeDocumentListResult;
  lookups: DocumentsLookups;
  permissionCodes: string[];
  selfOnly?: boolean;
};

export function EmployeeDocumentsManagement({
  result,
  lookups,
  permissionCodes,
  selfOnly = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<EmployeeDocumentItem | null>(null);
  const actions = useDocumentFileActions(() => router.refresh());

  const canUpload = canUploadDocuments(permissionCodes);
  const canEdit = canEditDocuments(permissionCodes);
  const canDelete = canDeleteDocuments(permissionCodes);

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    if (!patch.page) params.delete("page");
    startTransition(() => {
      router.push(`${DOCUMENTS_ROUTES.employeeDocuments}?${params.toString()}`);
    });
  }

  const columns = useMemo<DataTableColumn<EmployeeDocumentItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "employeeCode",
        header: "Employee",
        render: (row) => (
          <div>
            <p className="font-medium">{row.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
          </div>
        ),
      },
      {
        key: "departmentName",
        header: "Department",
        render: (row) => row.departmentName ?? "—",
      },
      {
        key: "documentTypeName",
        header: "Type",
      },
      {
        key: "title",
        header: "Document",
        render: (row) => (
          <div>
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">
              {row.fileName} · {formatBytes(row.fileSizeBytes)}
            </p>
          </div>
        ),
      },
      {
        key: "documentStatus",
        header: "Status",
        render: (row) => (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {DOCUMENT_STATUS_LABELS[row.documentStatus]}
          </span>
        ),
      },
      {
        key: "expiryDate",
        header: "Expiry",
        render: (row) =>
          row.expiryDate ? format(new Date(row.expiryDate), "dd MMM yyyy") : "—",
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => actions.openSigned(row.storagePath, "preview")}
              aria-label="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => actions.openSigned(row.storagePath, "download")}
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            {canUpload && !(row.isOfficial && selfOnly) ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setReplaceDoc(row);
                  setUploadOpen(true);
                }}
                aria-label="Replace"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            ) : null}
            {canEdit && row.documentStatus === "pending" ? (
              <>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => actions.verify(row.id, "verified")}
                  aria-label="Verify"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => actions.verify(row.id, "rejected")}
                  aria-label="Reject"
                >
                  <ShieldX className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => actions.archive(row.id)}
                aria-label="Archive"
              >
                <Archive className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [actions, canDelete, canEdit, canUpload, selfOnly],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employee Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage uploads, verification, and employee document folders.
          </p>
        </div>
        {canUpload ? (
          <Button
            onClick={() => {
              setReplaceDoc(null);
              setUploadOpen(true);
            }}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <Input
          placeholder="Search title or file…"
          defaultValue={searchParams.get("search") ?? ""}
          onBlur={(e) => updateParams({ search: e.target.value || undefined })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ search: (e.target as HTMLInputElement).value || undefined });
            }
          }}
        />
        {!selfOnly ? (
          <LabeledSelect
            items={[
              { value: "__all__", label: "All employees" },
              ...lookups.employees.map((e) => ({ value: e.id, label: e.label })),
            ]}
            value={searchParams.get("employeeId") || "__all__"}
            onValueChange={(value) =>
              updateParams({ employeeId: value === "__all__" ? undefined : value })
            }
            placeholder="Employee"
          />
        ) : null}
        {!selfOnly ? (
          <LabeledSelect
            items={[
              { value: "__all__", label: "All departments" },
              ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
            ]}
            value={searchParams.get("departmentId") || "__all__"}
            onValueChange={(value) =>
              updateParams({ departmentId: value === "__all__" ? undefined : value })
            }
            placeholder="Department"
          />
        ) : null}
        <LabeledSelect
          items={[
            { value: "__all__", label: "All types" },
            ...lookups.documentTypes.map((t) => ({ value: t.id, label: t.name })),
          ]}
          value={searchParams.get("documentTypeId") || "__all__"}
          onValueChange={(value) =>
            updateParams({ documentTypeId: value === "__all__" ? undefined : value })
          }
          placeholder="Document type"
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All statuses" },
            ...Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          value={searchParams.get("documentStatus") || "__all__"}
          onValueChange={(value) =>
            updateParams({ documentStatus: value === "__all__" ? undefined : value })
          }
          placeholder="Status"
        />
      </div>

      {isPending || actions.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {result.data.length === 0 ? (
        <EmptyState
          title="No documents found"
          description="Upload employee documents or adjust your filters."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {(result.page - 1) * result.pageSize + 1}–
          {Math.min(result.page * result.pageSize, result.total)} of {result.total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1}
            onClick={() => updateParams({ page: String(result.page - 1) })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page * result.pageSize >= result.total}
            onClick={() => updateParams({ page: String(result.page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <DocumentUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        lookups={lookups}
        defaultEmployeeId={
          replaceDoc?.employeeId ||
          (selfOnly ? lookups.employees[0]?.id : searchParams.get("employeeId") ?? "")
        }
        replaceDocumentId={replaceDoc?.id}
        defaultDocumentTypeId={replaceDoc?.documentTypeId}
        defaultTitle={replaceDoc?.title}
        lockEmployee={selfOnly || Boolean(replaceDoc)}
      />
    </>
  );
}
