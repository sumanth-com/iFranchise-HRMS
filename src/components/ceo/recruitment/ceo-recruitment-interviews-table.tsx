"use client";

import { format } from "date-fns";
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
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/recruitment/constants";
import type { CeoRecruitmentInterviewRow } from "@/types/ceo-recruitment";

type CeoRecruitmentInterviewsTableProps = {
  interviews: CeoRecruitmentInterviewRow[];
  isLoading?: boolean;
  onSelectCandidate: (candidateId: string) => void;
};

export function CeoRecruitmentInterviewsTable({
  interviews,
  isLoading,
  onSelectCandidate,
}: CeoRecruitmentInterviewsTableProps) {
  const columns = useMemo<ColumnDef<CeoRecruitmentInterviewRow>[]>(
    () => [
      {
        accessorKey: "candidateName",
        header: "Candidate",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onSelectCandidate(row.original.candidateId)}
          >
            {row.original.candidateName}
          </button>
        ),
      },
      {
        accessorKey: "jobTitle",
        header: "Position",
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "interviewerName",
        header: "Interviewer",
      },
      {
        accessorKey: "interviewDate",
        header: "Date",
        cell: ({ row }) =>
          format(new Date(row.original.interviewDate), "d MMM yyyy"),
      },
      {
        accessorKey: "interviewTime",
        header: "Time",
        cell: ({ row }) => row.original.interviewTime || "—",
      },
      {
        accessorKey: "interviewType",
        header: "Interview Type",
        cell: ({ row }) => INTERVIEW_TYPE_LABELS[row.original.interviewType],
      },
      {
        accessorKey: "interviewStatus",
        header: "Status",
        cell: ({ row }) => (
          <RecruitmentStatusBadge
            status={row.original.interviewStatus}
            label={INTERVIEW_STATUS_LABELS[row.original.interviewStatus]}
          />
        ),
      },
    ],
    [onSelectCandidate],
  );

  const table = useReactTable({
    data: interviews,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!isLoading && interviews.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Upcoming Interviews</h2>
        <p className="text-xs text-muted-foreground">
          Scheduled interviews across the organization
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
                  Loading interviews…
                </TableCell>
              </TableRow>
            ) : interviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No upcoming interviews for the current filters.
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
