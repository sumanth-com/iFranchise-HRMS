"use client";

import { format } from "date-fns";
import { Eye, MessageSquareWarning, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/common/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EXECUTIVE_APPROVAL_PRIORITY_LABELS,
} from "@/lib/ceo/executive-approvals-constants";
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
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onClarify: (requestId: string) => void;
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
  onApprove,
  onReject,
  onClarify,
}: CeoApprovalsQueueTableProps) {
  const columns = useMemo<ColumnDef<CeoApprovalsQueueRow>[]>(
    () => [
      {
        accessorKey: "requestCode",
        header: "Request ID",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onView(row.original.id)}
          >
            {row.original.requestCode}
          </button>
        ),
      },
      {
        accessorKey: "approvalTypeLabel",
        header: "Approval Type",
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "requestedByName",
        header: "Requested By",
        cell: ({ row }) => row.original.requestedByName ?? "System / HR",
      },
      {
        accessorKey: "submittedAt",
        header: "Submitted Date",
        cell: ({ row }) => format(new Date(row.original.submittedAt), "dd MMM yyyy"),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <span className={cn("text-xs font-semibold uppercase", priorityClass(row.original.priority))}>
            {EXECUTIVE_APPROVAL_PRIORITY_LABELS[row.original.priority]}
          </span>
        ),
      },
      {
        accessorKey: "statusLabel",
        header: "Current Status",
        cell: ({ row }) => (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
            {row.original.statusLabel}
          </span>
        ),
      },
      {
        accessorKey: "dueAt",
        header: "Due Date",
        cell: ({ row }) =>
          row.original.dueAt ? (
            <span className={row.original.isOverdue ? "text-destructive" : undefined}>
              {format(new Date(row.original.dueAt), "dd MMM yyyy")}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const canAct = ["pending_ceo", "escalated", "forwarded"].includes(
            row.original.status,
          );
          return (
            <div className="flex flex-wrap items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onView(row.original.id)}
              >
                <Eye className="size-3.5" />
                View
              </Button>
              {canAct ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onApprove(row.original.id)}
                  >
                    <ThumbsUp className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(row.original.id)}
                  >
                    <ThumbsDown className="size-3.5" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onClarify(row.original.id)}
                  >
                    <MessageSquareWarning className="size-3.5" />
                    Clarify
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [onApprove, onClarify, onReject, onView],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Approval Queue</h2>
        <p className="text-xs text-muted-foreground">
          Strategic approvals escalated for CEO authorization.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {isLoading ? "Loading approvals…" : "No executive approvals match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={isLoading ? "opacity-60" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
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
    </section>
  );
}
