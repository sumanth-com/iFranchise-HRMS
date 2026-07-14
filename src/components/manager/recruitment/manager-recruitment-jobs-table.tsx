"use client";

import { Eye, MoreHorizontal, Users } from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

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
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import { JOB_STATUS_LABELS } from "@/lib/recruitment/constants";
import type { TeamRecruitmentJobRow } from "@/types/manager-recruitment";

type ManagerRecruitmentJobsTableProps = {
  records: TeamRecruitmentJobRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onViewCandidates: (jobOpeningId: string) => void;
};

export function ManagerRecruitmentJobsTable({
  records,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onViewCandidates,
}: ManagerRecruitmentJobsTableProps) {
  const columns = useMemo<ColumnDef<TeamRecruitmentJobRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Position",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            {row.original.jobCode ? (
              <p className="text-xs text-muted-foreground">{row.original.jobCode}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "hiringManagerName",
        header: "Hiring Manager",
        cell: ({ row }) => row.original.hiringManagerName ?? "—",
      },
      {
        accessorKey: "vacancies",
        header: "Vacancies",
      },
      {
        accessorKey: "applicationCount",
        header: "Applications",
      },
      {
        id: "interviewProgress",
        header: "Interview Progress",
        cell: ({ row }) => {
          const { interviewsCompleted, interviewsTotal } = row.original;
          if (!interviewsTotal) return "—";
          const pct = Math.round((interviewsCompleted / interviewsTotal) * 100);
          return `${interviewsCompleted}/${interviewsTotal} (${pct}%)`;
        },
      },
      {
        accessorKey: "hiringStatus",
        header: "Hiring Status",
        cell: ({ row }) => (
          <RecruitmentStatusBadge
            status={row.original.hiringStatus}
            label={JOB_STATUS_LABELS[row.original.hiringStatus]}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewCandidates(row.original.id)}>
                <Users className="size-4" />
                Candidates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewCandidates(row.original.id)}>
                <Eye className="size-4" />
                View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onViewCandidates],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="rounded-xl border bg-card shadow-sm">
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Loading job openings...
                </TableCell>
              </TableRow>
            ) : records.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No job openings in your managed departments.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          {total} job{total === 1 ? "" : "s"}
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
    </div>
  );
}
