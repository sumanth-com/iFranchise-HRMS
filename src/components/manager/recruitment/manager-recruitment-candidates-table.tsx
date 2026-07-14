"use client";

import { format, parseISO } from "date-fns";
import {
  CalendarPlus,
  Eye,
  MessageSquare,
  MoreHorizontal,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
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
  DropdownMenuSeparator,
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
import {
  CANDIDATE_STAGE_LABELS,
  INTERVIEW_STATUS_LABELS,
} from "@/lib/recruitment/constants";
import type { TeamRecruitmentCandidateRow } from "@/types/manager-recruitment";
import { cn } from "@/lib/utils";

export type CandidateDrawerTab = "profile" | "interview" | "feedback" | "offer";

type ManagerRecruitmentCandidatesTableProps = {
  records: TeamRecruitmentCandidateRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onViewProfile: (candidateId: string, tab?: CandidateDrawerTab) => void;
  onReject: (candidateId: string) => void;
};

export function ManagerRecruitmentCandidatesTable({
  records,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onViewProfile,
  onReject,
}: ManagerRecruitmentCandidatesTableProps) {
  const columns = useMemo<ColumnDef<TeamRecruitmentCandidateRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Candidate",
        cell: ({ row }) => (
          <div>
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => onViewProfile(row.original.id, "profile")}
            >
              {row.original.fullName}
            </button>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
            {row.original.pendingFeedback ? (
              <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                Feedback pending
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "appliedPosition",
        header: "Applied Position",
      },
      {
        accessorKey: "experienceYears",
        header: "Experience",
        cell: ({ row }) =>
          row.original.experienceYears != null
            ? `${row.original.experienceYears} yrs`
            : "—",
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => row.original.source ?? "—",
      },
      {
        accessorKey: "currentStage",
        header: "Current Stage",
        cell: ({ row }) => (
          <RecruitmentStatusBadge
            status={row.original.currentStage}
            label={CANDIDATE_STAGE_LABELS[row.original.currentStage]}
          />
        ),
      },
      {
        accessorKey: "assignedRecruiterName",
        header: "Assigned Recruiter",
        cell: ({ row }) => row.original.assignedRecruiterName ?? "—",
      },
      {
        accessorKey: "interviewDate",
        header: "Interview Date",
        cell: ({ row }) =>
          row.original.interviewDate
            ? format(parseISO(row.original.interviewDate), "dd MMM yyyy")
            : "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.interviewStatus ? (
            <RecruitmentStatusBadge
              status={row.original.interviewStatus}
              label={INTERVIEW_STATUS_LABELS[row.original.interviewStatus]}
            />
          ) : (
            <RecruitmentStatusBadge
              status={row.original.currentStage}
              label={CANDIDATE_STAGE_LABELS[row.original.currentStage]}
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
              <DropdownMenuItem onClick={() => onViewProfile(row.original.id, "profile")}>
                <Eye className="size-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewProfile(row.original.id, "feedback")}>
                <MessageSquare className="size-4" />
                Provide Feedback
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewProfile(row.original.id, "interview")}>
                <CalendarPlus className="size-4" />
                Schedule Interview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewProfile(row.original.id, "offer")}>
                <ThumbsUp className="size-4" />
                Recommend
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onReject(row.original.id)}
              >
                <ThumbsDown className="size-4" />
                Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onViewProfile, onReject],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={cn("rounded-xl border bg-card shadow-sm", isLoading && "opacity-70")}>
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
                  Loading candidates...
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
                  No candidates in your managed departments.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          {total} candidate{total === 1 ? "" : "s"}
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
