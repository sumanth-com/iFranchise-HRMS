"use client";

import { format } from "date-fns";
import { Eye, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { removeTeamMemberAction } from "@/lib/manager/actions/team-actions";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { AttendanceStatus } from "@/types/attendance";
import type { TeamMemberListItem } from "@/types/manager-team";

type ManagerTeamTableProps = {
  employees: TeamMemberListItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
};

export function ManagerTeamTable({
  employees,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onRefresh,
}: ManagerTeamTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberListItem | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function handleDeleteConfirm() {
    if (!deleteTarget) return;

    startDelete(async () => {
      const result = await removeTeamMemberAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setDeleteTarget(null);
      onRefresh?.();
      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<TeamMemberListItem>[]>(
    () => [
      {
        id: "photo",
        header: "Photo",
        cell: ({ row }) => (
          <EmployeeAvatar
            firstName={row.original.firstName}
            lastName={row.original.lastName}
            profileImagePath={row.original.profileImagePath}
            className="size-8"
          />
        ),
      },
      {
        accessorKey: "employeeCode",
        header: "Employee ID",
      },
      {
        accessorKey: "fullName",
        header: "Employee Name",
        cell: ({ row }) => (
          <Link
            href={MANAGER_ROUTES.teamMember(row.original)}
            className="font-medium text-primary hover:underline"
          >
            {row.original.fullName}
          </Link>
        ),
      },
      {
        accessorKey: "designationTitle",
        header: "Designation",
        cell: ({ row }) => row.original.designationTitle ?? "—",
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "employmentTypeName",
        header: "Employment Type",
        cell: ({ row }) => row.original.employmentTypeName ?? "—",
      },
      {
        accessorKey: "managerName",
        header: "Manager",
        cell: ({ row }) => row.original.managerName ?? "—",
      },
      {
        accessorKey: "dateOfJoining",
        header: "Joining Date",
        cell: ({ row }) =>
          row.original.dateOfJoining
            ? format(new Date(row.original.dateOfJoining), "d MMM yyyy")
            : "—",
      },
      {
        accessorKey: "attendanceToday",
        header: "Attendance Today",
        cell: ({ row }) =>
          row.original.attendanceToday ? (
            <AttendanceStatusBadge
              status={row.original.attendanceToday as AttendanceStatus}
            />
          ) : (
            <span className="text-xs text-muted-foreground">Not marked</span>
          ),
      },
      {
        accessorKey: "leaveBalanceDays",
        header: "Leave Balance",
        cell: ({ row }) => `${row.original.leaveBalanceDays.toFixed(1)} day(s)`,
      },
      {
        accessorKey: "currentStatus",
        header: "Current Status",
        cell: ({ row }) => (
          <EmploymentStatusBadge status={row.original.employmentStatus} />
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
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(MANAGER_ROUTES.teamMember(row.original))}
              >
                <Eye className="mr-2 size-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
              {table.getRowModel().rows.length ? (
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {isLoading ? "Loading team members..." : "No team members found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            Showing {employees.length} of {total} team member(s)
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

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Are you sure you want to remove ${deleteTarget.fullName} (${deleteTarget.employeeCode}) from your team? This action cannot be undone.`
                : "Are you sure you want to remove this team member?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? "Removing..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
