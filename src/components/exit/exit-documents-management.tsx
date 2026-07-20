"use client";

import { format } from "date-fns";
import { ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { generateExitDocumentsAction } from "@/lib/exit/actions";
import { canExitDocuments, EXIT_STATUS_LABELS } from "@/lib/exit/constants";
import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { cn } from "@/lib/utils";
import type { ExitResignationItem } from "@/types/exit";

type ExitDocumentRow = {
  id: string;
  letterNumber: string;
  letterType: string;
  subject: string;
  letterStatus: string;
  generatedAt: string | null;
  publishedAt: string | null;
  resignationId: string | null;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
};

type Props = {
  documents: ExitDocumentRow[];
  resignations: ExitResignationItem[];
  permissionCodes: string[];
};

export function ExitDocumentsManagement({
  documents,
  resignations,
  permissionCodes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canGenerate = canExitDocuments(permissionCodes);

  const needingDocs = useMemo(
    () =>
      resignations.filter(
        (r) =>
          r.exitStatus === "documents" ||
          (r.exitStatus === "completed" &&
            !documents.some((d) => d.resignationId === r.id)),
      ),
    [documents, resignations],
  );

  function onGenerate(resignationId: string) {
    startTransition(async () => {
      const res = await generateExitDocumentsAction(resignationId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Exit documents generated");
      router.refresh();
    });
  }

  const columns: DataTableColumn<ExitDocumentRow & Record<string, unknown>>[] = [
    {
      key: "letterType",
      header: "Letter",
      render: (row) => (
        <div>
          <p className="font-medium">{row.letterType}</p>
          <p className="text-xs text-muted-foreground">{row.letterNumber}</p>
        </div>
      ),
    },
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
    {
      key: "subject",
      header: "Subject",
      render: (row) => (
        <span className="line-clamp-2 max-w-[220px] text-sm">{row.subject}</span>
      ),
    },
    {
      key: "letterStatus",
      header: "Status",
      render: (row) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
          {row.letterStatus}
        </span>
      ),
    },
    {
      key: "generatedAt",
      header: "Generated",
      render: (row) =>
        row.generatedAt ? format(new Date(row.generatedAt), "dd MMM yyyy") : "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) =>
        row.resignationId && canGenerate ? (
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={isPending}
            title="Regenerate"
            onClick={() => onGenerate(row.resignationId!)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exit Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relief letters and related exit documentation for departing employees.
          </p>
        </div>
        <Link
          href={DOCUMENTS_ROUTES.letters}
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Letters
        </Link>
      </div>

      {needingDocs.length > 0 && canGenerate ? (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium">Needs document generation</h2>
          <div className="space-y-2">
            {needingDocs.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{row.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.employeeCode} · {EXIT_STATUS_LABELS[row.exitStatus]}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => onGenerate(row.id)}
                >
                  {isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Generate
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState
          title="No exit documents"
          description="Generated relief letters and exit documents will appear here."
        />
      ) : (
        <DataTable columns={columns} data={documents} />
      )}
    </>
  );
}
