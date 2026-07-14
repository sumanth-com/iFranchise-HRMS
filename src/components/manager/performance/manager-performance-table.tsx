"use client";

import { CalendarDays, MoreHorizontal, Star, Target } from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { ReviewStatusBadge } from "@/components/performance/performance-status-badge";
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
import { RATING_LABELS } from "@/lib/performance/constants";
import type { TeamPerformanceRow } from "@/types/manager-performance";
import { cn } from "@/lib/utils";

type ManagerPerformanceTableProps = {
  records: TeamPerformanceRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onViewProfile: (employeeId: string, tab?: "overview" | "review" | "goals") => void;
  onScheduleOneOnOne: (employeeId: string) => void;
};

function formatRating(rating: number | null) {
  if (rating === null) return "Not rated";
  return RATING_LABELS[rating as keyof typeof RATING_LABELS] ?? `${rating}/5`;
}

function GoalsSummary({ row }: { row: TeamPerformanceRow }) {
  const totalGoals = row.goalsCompleted + row.pendingGoals;
  const completion =
    totalGoals > 0 ? Math.round((row.goalsCompleted / totalGoals) * 100) : 0;

  return (
    <span className="tabular-nums text-sm">
      {row.goalsCompleted}/{totalGoals || 0} done · {completion}%
      {row.goalsAtRisk > 0 ? ` · ${row.goalsAtRisk} at risk` : ""}
    </span>
  );
}

export function ManagerPerformanceTable({
  records,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onViewProfile,
  onScheduleOneOnOne,
}: ManagerPerformanceTableProps) {
  const columns = useMemo<ColumnDef<TeamPerformanceRow>[]>(
    () => [
      {
        accessorKey: "employeeName",
        header: "Team member",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.employeeName}</span>
        ),
      },
      {
        id: "performance",
        header: "Performance",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm">
            {row.original.currentRating ? (
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            ) : null}
            <span className="font-medium">{formatRating(row.original.currentRating)}</span>
            {row.original.isHighPerformer ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                High performer
              </span>
            ) : null}
          </span>
        ),
      },
      {
        id: "goals",
        header: "Goals",
        cell: ({ row }) => <GoalsSummary row={row.original} />,
      },
      {
        id: "review",
        header: "Review",
        cell: ({ row }) =>
          row.original.reviewStatus ? (
            <ReviewStatusBadge status={row.original.reviewStatus} />
          ) : (
            <span className="text-sm text-muted-foreground">No active review</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-[10rem]">
              <DropdownMenuItem
                className="whitespace-nowrap"
                onClick={() => onViewProfile(row.original.employeeId, "review")}
              >
                <Star className="mr-2 size-4 shrink-0" />
                Open review
              </DropdownMenuItem>
              <DropdownMenuItem
                className="whitespace-nowrap"
                onClick={() => onViewProfile(row.original.employeeId, "goals")}
              >
                <Target className="mr-2 size-4 shrink-0" />
                Manage goals
              </DropdownMenuItem>
              <DropdownMenuItem
                className="whitespace-nowrap"
                onClick={() => onScheduleOneOnOne(row.original.employeeId)}
              >
                <CalendarDays className="mr-2 size-4 shrink-0" />
                Schedule 1:1
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onScheduleOneOnOne, onViewProfile],
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
                    row.original.needsAttention &&
                      "bg-amber-50/60 dark:bg-amber-950/20",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-middle whitespace-nowrap py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? "Loading team performance..." : "No team records found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Showing {records.length} of {total} team member(s)
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
