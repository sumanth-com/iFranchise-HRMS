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

import { Button } from "@/components/common/button";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CANDIDATE_STAGE_LABELS } from "@/lib/recruitment/constants";
import { formatCurrency } from "@/lib/recruitment/services/recruitment-utils";
import type { CeoRecruitmentCandidateRow } from "@/types/ceo-recruitment";

type CeoRecruitmentCandidatesTableProps = {
  candidates: CeoRecruitmentCandidateRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (candidateId: string) => void;
};

export function CeoRecruitmentCandidatesTable({
  candidates,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
}: CeoRecruitmentCandidatesTableProps) {
  const columns = useMemo<ColumnDef<CeoRecruitmentCandidateRow>[]>(
    () => [
      {
        accessorKey: "candidateCode",
        header: "Candidate ID",
      },
      {
        accessorKey: "fullName",
        header: "Candidate Name",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onView(row.original.id)}
          >
            {row.original.fullName}
          </button>
        ),
      },
      {
        accessorKey: "jobTitle",
        header: "Applied Position",
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "recruiterName",
        header: "Recruiter",
        cell: ({ row }) => row.original.recruiterName ?? "—",
      },
      {
        accessorKey: "stage",
        header: "Current Stage",
        cell: ({ row }) => (
          <RecruitmentStatusBadge
            status={row.original.stage}
            label={CANDIDATE_STAGE_LABELS[row.original.stage]}
          />
        ),
      },
      {
        accessorKey: "interviewDate",
        header: "Interview Date",
        cell: ({ row }) =>
          row.original.interviewDate
            ? format(new Date(row.original.interviewDate), "d MMM yyyy")
            : "—",
      },
      {
        accessorKey: "experienceYears",
        header: "Experience",
        cell: ({ row }) =>
          row.original.experienceYears != null
            ? `${row.original.experienceYears} yr`
            : "—",
      },
      {
        accessorKey: "expectedCtc",
        header: "Expected Salary",
        cell: ({ row }) => formatCurrency(row.original.expectedCtc),
      },
      {
        accessorKey: "statusLabel",
        header: "Status",
        cell: ({ row }) => (
          <RecruitmentStatusBadge
            status={row.original.stage}
            label={row.original.statusLabel}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
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
    data: candidates,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Candidates</h2>
        <p className="text-xs text-muted-foreground">
          Company-wide recruitment pipeline · view only
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
                  Loading candidates…
                </TableCell>
              </TableRow>
            ) : candidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No candidates match the current filters.
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
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Showing {candidates.length} of {total} candidates
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
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
