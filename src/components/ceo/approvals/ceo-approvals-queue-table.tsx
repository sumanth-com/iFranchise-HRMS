"use client";

import { format } from "date-fns";
import { Eye } from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { formatCeoCurrency } from "@/components/ceo/ceo-module-primitives";
import { Button } from "@/components/common/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EXECUTIVE_APPROVAL_PRIORITY_LABELS } from "@/lib/ceo/executive-approvals-constants";
import { cn } from "@/lib/utils";
import type { CeoApprovalsQueueRow } from "@/types/ceo-approvals";

type CeoApprovalsQueueTableProps = {
  rows: CeoApprovalsQueueRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (requestId: string) => void;
};

function priorityClass(priority: CeoApprovalsQueueRow["priority"]) {
  switch (priority) {
    case "critical":
    case "high":
      return "text-destructive";
    case "medium":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

export function CeoApprovalsQueueTable({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
}: CeoApprovalsQueueTableProps) {
  const columns = useMemo<ColumnDef<CeoApprovalsQueueRow>[]>(
    () => [
      {
        accessorKey: "requestCode",
        header: "Request",
        cell: ({ row }) => (
          <div className="min-w-0">
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => onView(row.original.id)}
            >
              {row.original.requestCode}
            </button>
            <p className="mt-0.5 max-w-[16rem] truncate text-xs text-muted-foreground">
              {row.original.title}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "approvalTypeLabel",
        header: "Type",
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-xs font-semibold uppercase",
              priorityClass(row.original.priority),
            )}
          >
            {EXECUTIVE_APPROVAL_PRIORITY_LABELS[row.original.priority]}
          </span>
        ),
      },
      {
        accessorKey: "statusLabel",
        header: "Status",
        cell: ({ row }) => (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
            {row.original.statusLabel}
          </span>
        ),
      },
      {
        accessorKey: "dueAt",
        header: "Due",
        cell: ({ row }) =>
          row.original.dueAt ? (
            <span
              className={cn(
                "tabular-nums",
                row.original.isOverdue ? "font-medium text-destructive" : undefined,
              )}
            >
              {format(new Date(row.original.dueAt), "d MMM yyyy")}
            </span>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "financialImpact",
        header: "Impact",
        cell: ({ row }) =>
          row.original.financialImpact > 0
            ? formatCeoCurrency(row.original.financialImpact)
            : "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => onView(row.original.id)}
          >
            <Eye className="size-3.5" />
            Review
          </Button>
        ),
      },
    ],
    [onView],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="w-full space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Approval Queue</h2>
        <p className="text-xs text-muted-foreground">
          Open a request to approve, reject, clarify, or forward
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isLoading
                      ? "Loading approvals…"
                      : "No executive approvals match these filters."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={isLoading ? "opacity-60" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {total > pageSize ? (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1 || isLoading}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <span className="tabular-nums text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages || isLoading}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
