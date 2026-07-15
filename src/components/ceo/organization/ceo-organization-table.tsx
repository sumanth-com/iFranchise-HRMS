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
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CeoOrgDirectoryItem } from "@/types/ceo-organization";

type CeoOrganizationTableProps = {
  employees: CeoOrgDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (employeeId: string) => void;
};

export function CeoOrganizationTable({
  employees,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
}: CeoOrganizationTableProps) {
  const columns = useMemo<ColumnDef<CeoOrgDirectoryItem>[]>(
    () => [
      {
        accessorKey: "employeeCode",
        header: "Employee ID",
      },
      {
        accessorKey: "fullName",
        header: "Employee Name",
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
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "designationTitle",
        header: "Designation",
        cell: ({ row }) => row.original.designationTitle ?? "—",
      },
      {
        accessorKey: "managerName",
        header: "Reporting Manager",
        cell: ({ row }) => row.original.managerName ?? "—",
      },
      {
        accessorKey: "employmentTypeName",
        header: "Employment Type",
        cell: ({ row }) => row.original.employmentTypeName ?? "—",
      },
      {
        accessorKey: "employmentStatus",
        header: "Status",
        cell: ({ row }) => (
          <EmploymentStatusBadge status={row.original.employmentStatus} />
        ),
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
        accessorKey: "experienceYears",
        header: "Experience",
        cell: ({ row }) =>
          row.original.experienceYears != null
            ? `${row.original.experienceYears} yr`
            : "—",
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => row.original.location ?? "—",
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
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Organization Directory</h2>
        <p className="text-xs text-muted-foreground">
          Company-wide workforce · view only
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
                  Loading employees…
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No employees match the current filters.
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
          Showing {employees.length} of {total} employees
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
