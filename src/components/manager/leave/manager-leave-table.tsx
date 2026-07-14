"use client";

import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { Button } from "@/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import type {
  ManagerLeaveWorkflowStatus,
  TeamLeaveListItem,
} from "@/types/manager-leave";
import { cn } from "@/lib/utils";

const WORKFLOW_LABELS: Record<ManagerLeaveWorkflowStatus, string> = {
  pending: "Pending",
  approved_by_manager: "Approved by Manager",
  rejected_by_manager: "Rejected by Manager",
  sent_to_hr: "Sent to HR",
  completed: "Completed",
};

const WORKFLOW_STYLES: Record<ManagerLeaveWorkflowStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved_by_manager:
    "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  rejected_by_manager:
    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  sent_to_hr: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

function WorkflowBadge({ status }: { status: ManagerLeaveWorkflowStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        WORKFLOW_STYLES[status],
      )}
    >
      {WORKFLOW_LABELS[status]}
    </span>
  );
}

type ManagerLeaveTableProps = {
  records: TeamLeaveListItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onViewDetails: (leaveRequestId: string) => void;
  onApprove: (leaveRequestId: string) => void;
  onReject: (leaveRequestId: string) => void;
};

export function ManagerLeaveTable({
  records,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onViewDetails,
  onApprove,
  onReject,
}: ManagerLeaveTableProps) {
  const columns = useMemo<ColumnDef<TeamLeaveListItem>[]>(
    () => [
      {
        accessorKey: "employeeName",
        header: "Employee",
        cell: ({ row }) => (
          <div>
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => onViewDetails(row.original.id)}
            >
              {row.original.employeeName}
            </button>
            {row.original.hasConflicts ? (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-3" />
                Conflict warning
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "employeeCode",
        header: "Employee ID",
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "leaveTypeName",
        header: "Leave Type",
      },
      {
        accessorKey: "startDate",
        header: "From Date",
        cell: ({ row }) => formatLeaveDate(row.original.startDate),
      },
      {
        accessorKey: "endDate",
        header: "To Date",
        cell: ({ row }) => formatLeaveDate(row.original.endDate),
      },
      {
        accessorKey: "totalDays",
        header: "Total Days",
        cell: ({ row }) => `${row.original.totalDays} day(s)`,
      },
      {
        accessorKey: "appliedAt",
        header: "Applied Date",
        cell: ({ row }) => format(parseISO(row.original.appliedAt), "d MMM yyyy"),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[12rem] text-sm">
            {row.original.reason ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "leaveStatus",
        header: "Status",
        cell: ({ row }) => (
          <div className="space-y-1">
            <LeaveStatusBadge status={row.original.leaveStatus} />
            <WorkflowBadge status={row.original.workflowStatus} />
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const canAct =
            row.original.leaveStatus === "pending" &&
            row.original.workflowStatus === "pending";
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Open actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails(row.original.id)}>
                  <Eye className="mr-2 size-4" />
                  View
                </DropdownMenuItem>
                {canAct ? (
                  <>
                    <DropdownMenuItem onClick={() => onApprove(row.original.id)}>
                      <CheckCircle2 className="mr-2 size-4" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReject(row.original.id)}>
                      <XCircle className="mr-2 size-4" />
                      Reject
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onApprove, onReject, onViewDetails],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    row.original.hasConflicts &&
                      "bg-amber-50/60 dark:bg-amber-950/20",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-top whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? "Loading leave requests..." : "No leave requests found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Showing {records.length} of {total} request(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
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
