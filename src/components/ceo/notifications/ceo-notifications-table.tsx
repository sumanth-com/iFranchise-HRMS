"use client";

import { format } from "date-fns";
import { Archive, CheckCheck, Eye } from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/common/button";
import {
  NotificationPriorityBadge,
  NotificationStatusBadge,
} from "@/components/notifications/notification-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNotificationDisplayText } from "@/lib/notifications/constants";
import type { CeoNotificationListItem } from "@/types/ceo-notifications";

type Props = {
  rows: CeoNotificationListItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
};

export function CeoNotificationsTable({
  rows,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
  onMarkRead,
  onArchive,
}: Props) {
  const columns = useMemo<ColumnDef<CeoNotificationListItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Notification",
        cell: ({ row }) => (
          <button
            type="button"
            className="max-w-[280px] text-left"
            onClick={() => onView(row.original.id)}
          >
            <p className="font-medium text-primary hover:underline">
              {formatNotificationDisplayText(row.original.title)}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {formatNotificationDisplayText(row.original.message)}
            </p>
          </button>
        ),
      },
      { accessorKey: "categoryLabel", header: "Category" },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <NotificationPriorityBadge priority={row.original.priority} />
        ),
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "createdAt",
        header: "Received Time",
        cell: ({ row }) =>
          format(new Date(row.original.createdAt), "dd MMM yyyy HH:mm"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <NotificationStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onView(row.original.id)}
            >
              <Eye className="size-3.5" />
              View
            </Button>
            {row.original.status === "unread" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onMarkRead(row.original.id)}
              >
                <CheckCheck className="size-3.5" />
                Mark Read
              </Button>
            ) : null}
            {row.original.status !== "archived" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onArchive(row.original.id)}
              >
                <Archive className="size-3.5" />
                Archive
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [onArchive, onMarkRead, onView],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Notification List</h2>
          <p className="text-xs text-muted-foreground">
            {total} executive notification{total === 1 ? "" : "s"}
          </p>
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Refreshing…</p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
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
                <TableCell colSpan={columns.length} className="h-28 text-center">
                  <p className="text-sm font-medium">No executive notifications found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Adjust filters or wait for new executive alerts.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.original.status === "unread" ? "bg-primary/[0.03]" : undefined}
                >
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

      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
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
