"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Eye } from "lucide-react";
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
import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import type { CeoPerformanceDepartmentRow } from "@/types/ceo-performance";

type CeoPerformanceDepartmentsTableProps = {
  departments: CeoPerformanceDepartmentRow[];
  isLoading?: boolean;
  onView: (departmentId: string) => void;
};

function TrendCell({
  trend,
  delta,
}: {
  trend: CeoPerformanceDepartmentRow["performanceTrend"];
  delta: number | null;
}) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <ArrowUpRight className="size-3.5" />
        {delta != null ? `+${delta}` : "Up"}
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <ArrowDownRight className="size-3.5" />
        {delta != null ? String(delta) : "Down"}
      </span>
    );
  }
  if (trend === "flat") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <ArrowRight className="size-3.5" />
        Stable
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

export function CeoPerformanceDepartmentsTable({
  departments,
  isLoading,
  onView,
}: CeoPerformanceDepartmentsTableProps) {
  const columns = useMemo<ColumnDef<CeoPerformanceDepartmentRow>[]>(
    () => [
      { accessorKey: "name", header: "Department" },
      {
        accessorKey: "headName",
        header: "Department Head",
        cell: ({ row }) => row.original.headName ?? "—",
      },
      {
        accessorKey: "employeeCount",
        header: "Employees",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.employeeCount}</span>
        ),
      },
      {
        accessorKey: "averageRating",
        header: "Average Rating",
        cell: ({ row }) =>
          row.original.averageRating != null
            ? row.original.averageRating.toFixed(1)
            : "—",
      },
      {
        accessorKey: "goalCompletionPercent",
        header: "Goal Completion %",
        cell: ({ row }) => formatCeoPercent(row.original.goalCompletionPercent),
      },
      {
        accessorKey: "pendingReviews",
        header: "Pending Reviews",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.pendingReviews}</span>
        ),
      },
      {
        accessorKey: "promotionEligible",
        header: "Promotion Eligible",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.promotionEligible}</span>
        ),
      },
      {
        id: "trend",
        header: "Performance Trend",
        cell: ({ row }) => (
          <TrendCell
            trend={row.original.performanceTrend}
            delta={row.original.trendDelta}
          />
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => onView(row.original.id)}
          >
            <Eye className="size-3.5" />
            View
          </Button>
        ),
      },
    ],
    [onView],
  );

  const table = useReactTable({
    data: departments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Department Performance</h2>
        <p className="text-xs text-muted-foreground">
          Department heads, ratings, and review backlog · view only
        </p>
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading departments…
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No departments match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
    </section>
  );
}
