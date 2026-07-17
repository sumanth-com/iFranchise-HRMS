import { format, parseISO } from "date-fns";

import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { DocumentDownloadButton } from "@/components/employee/documents/document-download-button";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { listEmployeeDocuments } from "@/lib/documents/services/document-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { EmployeeDocumentItem } from "@/types/documents";

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EmployeeDocumentsPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "documents.view",
  ]);
  const supabase = await createClient();
  const documents = await listEmployeeDocuments(supabase, profile, {
    page: 1,
    pageSize: 50,
  });

  const columns: DataTableColumn<EmployeeDocumentItem>[] = [
    {
      key: "title",
      header: "Document",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.title}</p>
          <p className="truncate text-xs text-muted-foreground">{row.documentTypeName}</p>
        </div>
      ),
    },
    { key: "fileName", header: "File", render: (row) => <span className="truncate">{row.fileName}</span> },
    { key: "fileSizeBytes", header: "Size", render: (row) => formatSize(row.fileSizeBytes) },
    {
      key: "documentStatus",
      header: "Status",
      render: (row) => (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
          {row.documentStatus}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Added",
      render: (row) => format(parseISO(row.createdAt), "dd MMM yyyy"),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => <DocumentDownloadButton storagePath={row.storagePath} />,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your personal documents and company-issued letters.
          </p>
        </div>
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <DataTable
            columns={columns}
            data={documents.data}
            emptyMessage="No documents available yet."
          />
        </section>
      </div>
    </div>
  );
}
