"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import {
  EmployeeAccountStatusBadge,
  EmployeeLoginStatusBadge,
} from "@/components/employees/employee-account-status-badge";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
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
import { Modal } from "@/components/common/modal";
import { deleteEmployeeAction } from "@/lib/employees/actions";
import {
  EMPLOYEE_ACCOUNT_STATUS_LABELS,
  EMPLOYEE_ROUTES,
  EMPLOYMENT_STATUS_LABELS,
} from "@/lib/employees/constants";
import type { EmployeeListItem, LookupOption } from "@/types/employee";
import { useState } from "react";
import { cn } from "@/lib/utils";

type EmployeeTableProps = {
  employees: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  department?: string;
  employmentStatus?: string;
  accountStatus?: string;
  departments: LookupOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function EmployeeTable({
  employees,
  total,
  page,
  pageSize,
  search,
  sortBy,
  sortOrder,
  department,
  employmentStatus,
  accountStatus,
  departments,
  canCreate,
  canEdit,
  canDelete,
}: EmployeeTableProps) {
  const router = useRouter();
  const initialParams = useSearchParams();
  const filterParamsRef = useRef(initialParams.toString());
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", EMPLOYEE_ROUTES.list);
    }
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(filterParamsRef.current);

      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      filterParamsRef.current = params.toString();

      startTransition(() => {
        const query = params.toString();
        router.push(query ? `${EMPLOYEE_ROUTES.list}?${query}` : EMPLOYEE_ROUTES.list);
        window.setTimeout(() => {
          window.history.replaceState(null, "", EMPLOYEE_ROUTES.list);
        }, 0);
      });
    },
    [router, startTransition],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const departmentItems = useMemo(
    () => [
      { value: "", label: "All departments" },
      ...departments
        .filter((item) => Boolean(item.code))
        .map((item) => ({
          value: item.code as string,
          label: item.label,
        })),
    ],
    [departments],
  );

  const employmentStatusItems = useMemo(
    () => [
      { value: "", label: "All statuses" },
      ...Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  );

  const accountStatusItems = useMemo(
    () => [
      { value: "", label: "All accounts" },
      { value: "active", label: EMPLOYEE_ACCOUNT_STATUS_LABELS.active },
      { value: "invitation_pending", label: "Pending Invitation" },
      { value: "suspended", label: EMPLOYEE_ACCOUNT_STATUS_LABELS.suspended },
      { value: "inactive", label: EMPLOYEE_ACCOUNT_STATUS_LABELS.inactive },
    ],
    [],
  );

  const columns = useMemo<ColumnDef<EmployeeListItem>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <div className="flex min-w-[15rem] items-center gap-3">
            <EmployeeAvatar
              firstName={row.original.firstName}
              lastName={row.original.lastName}
              profileImagePath={row.original.profileImagePath}
              className="size-9"
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.employeeCode} · {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "role",
        header: "Department / Designation",
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <p className="truncate text-sm">{row.original.departmentName ?? "—"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.designationTitle ?? "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "employmentStatus",
        header: "Employee Status",
        cell: ({ row }) => (
          <EmploymentStatusBadge status={row.original.employmentStatus} />
        ),
      },
      {
        id: "account",
        header: "Account",
        cell: ({ row }) => (
          <div className="min-w-[12rem] space-y-1">
            <div className="flex flex-wrap gap-1.5">
              <EmployeeAccountStatusBadge status={row.original.accountStatus} />
              <EmployeeLoginStatusBadge status={row.original.accountStatus} />
            </div>
            <p className="text-xs text-muted-foreground">
              Last login:{" "}
              {row.original.lastLoginAt
                ? format(new Date(row.original.lastLoginAt), "MMM d, yyyy")
                : "—"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "dateOfJoining",
        header: "Joining Date",
        cell: ({ row }) =>
          row.original.dateOfJoining
            ? format(new Date(row.original.dateOfJoining), "MMM d, yyyy")
            : "—",
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
                onClick={() =>
                  router.push(
                    EMPLOYEE_ROUTES.detail({
                      employeeCode: row.original.employeeCode,
                      firstName: row.original.firstName,
                      lastName: row.original.lastName,
                    }),
                  )
                }
              >
                <Eye className="size-4" />
                View
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      EMPLOYEE_ROUTES.edit({
                        employeeCode: row.original.employeeCode,
                        firstName: row.original.firstName,
                        lastName: row.original.lastName,
                      }),
                    )
                  }
                >
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canDelete, canEdit, router],
  );

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  const handleSort = (column: string) => {
    const nextOrder =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    updateParams({ sortBy: column, sortOrder: nextOrder, page: "1" });
  };

  const sortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 size-3.5" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 size-3.5" />
    ) : (
      <ArrowDown className="ml-1 size-3.5" />
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteEmployeeAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Employee deleted successfully");
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name, email, or code..."
            defaultValue={search}
            className="sm:max-w-xs"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateParams({
                  search: event.currentTarget.value || undefined,
                  page: "1",
                });
              }
            }}
          />
          <Select
            items={departmentItems}
            value={department ?? ""}
            onValueChange={(value) =>
              updateParams({
                department: value || undefined,
                departmentId: undefined,
                branchId: undefined,
                page: "1",
              })
            }
          >
            <SelectTrigger className="h-8 w-full min-w-0 sm:w-44">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {departmentItems.map((item) => (
                <SelectItem
                  key={item.value || "all-departments"}
                  value={item.value}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={employmentStatusItems}
            value={employmentStatus ?? ""}
            onValueChange={(value) =>
              updateParams({
                employmentStatus: value || undefined,
                page: "1",
              })
            }
          >
            <SelectTrigger className="h-8 w-full min-w-0 sm:w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {employmentStatusItems.map((item) => (
                <SelectItem key={item.value || "all-statuses"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={accountStatusItems}
            value={accountStatus ?? ""}
            onValueChange={(value) =>
              updateParams({
                accountStatus: value || undefined,
                page: "1",
              })
            }
          >
            <SelectTrigger className="h-8 w-full min-w-0 sm:w-48">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {accountStatusItems.map((item) => (
                <SelectItem key={item.value || "all-accounts"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreate ? (
          <Link
            href={EMPLOYEE_ROUTES.new}
            className={cn(buttonVariants(), "shrink-0")}
          >
            <UserPlus className="size-4" />
            Add Employee
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center font-medium"
                  onClick={() => handleSort("first_name")}
                >
                  Employee
                  {sortIcon("first_name")}
                </button>
              </TableHead>
              <TableHead>Department / Designation</TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center font-medium"
                  onClick={() => handleSort("employment_status")}
                >
                  Employee Status
                  {sortIcon("employment_status")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center font-medium"
                  onClick={() => handleSort("account_status")}
                >
                  Account
                  {sortIcon("account_status")}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  className="inline-flex items-center font-medium"
                  onClick={() => handleSort("date_of_joining")}
                >
                  Joining Date
                  {sortIcon("date_of_joining")}
                </button>
              </TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(
                      EMPLOYEE_ROUTES.detail({
                        employeeCode: row.original.employeeCode,
                        firstName: row.original.firstName,
                        lastName: row.original.lastName,
                      }),
                    )
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={
                        cell.column.id === "actions"
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {employees.length === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, total)} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => updateParams({ page: String(page - 1) })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete employee"
        description={
          deleteTarget
            ? `Soft delete ${deleteTarget.fullName}? This action marks the employee as terminated and removes them from active lists.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <span />
      </Modal>
    </div>
  );
}
