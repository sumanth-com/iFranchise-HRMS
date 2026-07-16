"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JOB_STATUS_LABELS } from "@/lib/recruitment/constants";
import type { CeoRecruitmentJobRow } from "@/types/ceo-recruitment";

type CeoRecruitmentJobsTableProps = {
  jobs: CeoRecruitmentJobRow[];
  isLoading?: boolean;
  onSelectJob: (jobOpeningId: string) => void;
};

export function CeoRecruitmentJobsTable({
  jobs,
  isLoading,
  onSelectJob,
}: CeoRecruitmentJobsTableProps) {
  const columns = useMemo<ColumnDef<CeoRecruitmentJobRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Position",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onSelectJob(row.original.id)}
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "openPositions",
        header: "Openings",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.openPositions}</span>
        ),
      },
      {
        accessorKey: "candidateCount",
        header: "Candidates",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.candidateCount}</span>
        ),
      },
      {
        accessorKey: "hiringManagerName",
        header: "Hiring Manager",
        cell: ({ row }) => row.original.hiringManagerName ?? "—",
      },
      {
        accessorKey: "jobStatus",
        header: "Status",
        cell: ({ row }) => (
          <RecruitmentStatusBadge
            status={row.original.jobStatus}
            label={JOB_STATUS_LABELS[row.original.jobStatus]}
          />
        ),
      },
      {
        accessorKey: "daysOpen",
        header: "Days Open",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.daysOpen}</span>
        ),
      },
    ],
    [onSelectJob],
  );

  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!isLoading && jobs.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Open Positions</h2>
        <p className="text-xs text-muted-foreground">
          Active requisitions and candidate pipeline volume
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
                  Loading positions…
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No open positions for the current filters.
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
