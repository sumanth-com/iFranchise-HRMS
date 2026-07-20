"use client";

import { format } from "date-fns";
import { Archive, Download, Eye, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { DocumentUploadModal } from "@/components/documents/document-upload-modal";
import { useDocumentFileActions } from "@/components/documents/use-document-actions";
import {
  DOCUMENTS_ROUTES,
  canDeleteDocuments,
  canUploadDocuments,
} from "@/lib/documents/constants";
import type {
  DocumentsLookups,
  EmployeeDocumentItem,
  EmployeeDocumentListResult,
  ExpiringSummary,
} from "@/types/documents";

type Props = {
  summary: ExpiringSummary;
  result: EmployeeDocumentListResult;
  lookups: DocumentsLookups;
  permissionCodes: string[];
};

const WINDOW_CARDS = [
  { key: "expiringToday" as const, label: "Expiring Today", window: "today" },
  { key: "next7Days" as const, label: "Next 7 Days", window: "7" },
  { key: "next30Days" as const, label: "Next 30 Days", window: "30" },
  { key: "expired" as const, label: "Expired", window: "expired" },
];

export function ExpiringDocumentsManagement({
  summary,
  result,
  lookups,
  permissionCodes,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [renewDoc, setRenewDoc] = useState<EmployeeDocumentItem | null>(null);
  const actions = useDocumentFileActions(() => router.refresh());
  const canUpload = canUploadDocuments(permissionCodes);
  const canDelete = canDeleteDocuments(permissionCodes);
  const activeWindow = searchParams.get("expiringWindow") || "30";

  function setWindow(window: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("expiringWindow", window);
    params.delete("page");
    startTransition(() => {
      router.push(`${DOCUMENTS_ROUTES.expiring}?${params.toString()}`);
    });
  }

  const columns = useMemo<DataTableColumn<EmployeeDocumentItem & Record<string, unknown>>[]>(
    () => [
      {
        key: "employeeName",
        header: "Employee",
        render: (row) => (
          <div>
            <p className="font-medium">{row.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
          </div>
        ),
      },
      { key: "documentTypeName", header: "Document" },
      { key: "title", header: "Title" },
      {
        key: "expiryDate",
        header: "Expiry Date",
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
              onClick={() => actions.openSigned(row, "preview")}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => actions.openSigned(row, "download")}
            >
              <Download className="h-4 w-4" />
            </Button>
            {canUpload ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setRenewDoc(row)}
                aria-label="Renew"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
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
    [actions, canDelete, canUpload],
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expiring Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track passports, visas, licences, and certifications with expiry dates.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {WINDOW_CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setWindow(card.window)}
            className={`rounded-xl border p-4 text-left shadow-sm transition-colors ${
              activeWindow === card.window
                ? "border-primary bg-primary/5"
                : "bg-card hover:bg-muted/40"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary[card.key]}</p>
          </button>
        ))}
      </div>

      {isPending ? <p className="text-sm text-muted-foreground">Updating…</p> : null}

      {result.data.length === 0 ? (
        <EmptyState
          title="No expiring documents in this window"
          description="Documents with an expiry date will appear here."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <DocumentUploadModal
        open={Boolean(renewDoc)}
        onOpenChange={(next) => !next && setRenewDoc(null)}
        lookups={lookups}
        defaultEmployeeId={renewDoc?.employeeId}
        replaceDocumentId={renewDoc?.id}
        defaultDocumentTypeId={renewDoc?.documentTypeId}
        defaultTitle={renewDoc ? `Renewed ${renewDoc.title}` : ""}
        lockEmployee
      />
    </>
  );
}
