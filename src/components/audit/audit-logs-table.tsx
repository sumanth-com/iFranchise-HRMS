"use client";

import { format } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { AuditExportButtons } from "@/components/audit/audit-export-buttons";
import {
  AuditStatusBadge,
} from "@/components/audit/audit-status-badge";
import {
  AUDIT_ROUTES,
  formatAuditAction,
  formatAuditModule,
} from "@/lib/audit/constants";
import type { AuditListItem, AuditListResult } from "@/types/audit";

type Props = {
  result: AuditListResult;
  canExport: boolean;
  filters: Record<string, string | undefined>;
};

export function AuditLogsTable({ result, canExport, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${AUDIT_ROUTES.logs}?${params.toString()}`);
  };

  const columns = useMemo<DataTableColumn<AuditListItem>[]>(
    () => [
      {
        key: "occurredAt",
        header: "Timestamp",
        render: (row) => (
          <span className="whitespace-nowrap text-sm">
            {format(new Date(row.occurredAt), "dd MMM yyyy, HH:mm:ss")}
          </span>
        ),
      },
      {
        key: "userName",
        header: "User",
        render: (row) => (
          <div>
            <p className="font-medium">{row.userName ?? "System"}</p>
            {row.userEmail ? <p className="text-xs text-muted-foreground">{row.userEmail}</p> : null}
          </div>
        ),
      },
      { key: "roleName", header: "Role", render: (row) => row.roleName ?? "—" },
      { key: "module", header: "Module", render: (row) => formatAuditModule(row.module) },
      { key: "action", header: "Action", render: (row) => formatAuditAction(row.action) },
      { key: "recordId", header: "Record", render: (row) => <code className="text-xs">{row.recordId}</code> },
      {
        key: "description",
        header: "Description",
        className: "max-w-xs",
        render: (row) => <span className="line-clamp-2 text-sm text-muted-foreground">{row.description ?? "—"}</span>,
      },
      { key: "ipAddress", header: "IP Address", render: (row) => row.ipAddress ?? "—" },
      { key: "deviceType", header: "Device", render: (row) => row.deviceType ?? "—" },
      { key: "browser", header: "Browser", render: (row) => row.browser ?? "—" },
      { key: "eventStatus", header: "Status", render: (row) => <AuditStatusBadge status={row.eventStatus} /> },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Link
            href={AUDIT_ROUTES.detail(row.id)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Eye className="size-4" />
            View
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{result.total} audit entries</p>
        {canExport ? <AuditExportButtons filters={filters} disabled={isPending} /> : null}
      </div>

      {result.items.length === 0 ? (
        <EmptyState title="No audit logs" description="Activity will appear here as users interact with the HRMS." />
      ) : (
        <DataTable columns={columns} data={result.items} />
      )}

      {result.total > result.pageSize ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {result.page}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={result.page <= 1 || isPending} onClick={() => setPage(result.page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={result.page * result.pageSize >= result.total || isPending}
              onClick={() => startTransition(() => setPage(result.page + 1))}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Next"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
