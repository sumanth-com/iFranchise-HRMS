"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { EmployeeCardsGrid } from "@/components/employees/employee-cards-grid";
import { EmployeeDeleteConfirmDialog } from "@/components/employees/employee-delete-confirm-dialog";
import { deleteEmployeeAction, fetchEmployeesAction } from "@/lib/employees/actions";
import {
  EMPLOYEE_ACCOUNT_STATUS_LABELS,
  EMPLOYEE_ROUTES,
  EMPLOYMENT_STATUS_LABELS,
} from "@/lib/employees/constants";
import type {
  EmployeeListItem,
  EmployeeListParams,
  LookupOption,
} from "@/types/employee";
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
  employees: initialEmployees,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
  search: initialSearch,
  sortBy: initialSortBy,
  sortOrder: initialSortOrder,
  department: initialDepartment,
  employmentStatus: initialEmploymentStatus,
  accountStatus: initialAccountStatus,
  departments,
  canCreate,
  canEdit,
  canDelete,
}: EmployeeTableProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);
  const [tableState, setTableState] = useState({
    employees: initialEmployees,
    total: initialTotal,
    page: initialPage,
    pageSize: initialPageSize,
  });
  const [filters, setFilters] = useState<EmployeeListParams>({
    page: initialPage,
    pageSize: initialPageSize,
    search: initialSearch || undefined,
    sortBy: initialSortBy as EmployeeListParams["sortBy"],
    sortOrder: initialSortOrder,
    department: initialDepartment,
    employmentStatus: initialEmploymentStatus as EmployeeListParams["employmentStatus"],
    accountStatus: initialAccountStatus as EmployeeListParams["accountStatus"],
  });

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", EMPLOYEE_ROUTES.list);
    }
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const nextFilters: EmployeeListParams = {
        ...filters,
        page: updates.page ? Number(updates.page) : filters.page,
      };

      Object.entries(updates).forEach(([key, value]) => {
        if (key === "page" || key === "departmentId" || key === "branchId") return;
        (nextFilters as Record<string, unknown>)[key] = value || undefined;
      });

      setFilters(nextFilters);

      startTransition(async () => {
        const result = await fetchEmployeesAction(nextFilters);
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setTableState({
          employees: result.data.data,
          total: result.data.total,
          page: result.data.page,
          pageSize: result.data.pageSize,
        });
      });
    },
    [filters],
  );

  const { employees, total, page, pageSize } = tableState;
  const { search, department, employmentStatus, accountStatus } = filters;
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

  const handleDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteEmployeeAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        `${result.data.fullName} (${result.data.employeeCode}) was permanently removed.`,
      );
      setDeleteTarget(null);

      const refreshResult = await fetchEmployeesAction(filters);
      if (refreshResult.success) {
        setTableState({
          employees: refreshResult.data.data,
          total: refreshResult.data.total,
          page: refreshResult.data.page,
          pageSize: refreshResult.data.pageSize,
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name, email, or code..."
            defaultValue={search ?? ""}
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

      <div className={cn(isPending && "pointer-events-none opacity-70")}>
        <EmployeeCardsGrid
          employees={employees}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={setDeleteTarget}
        />
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

      <EmployeeDeleteConfirmDialog
        employee={deleteTarget}
        open={Boolean(deleteTarget)}
        isPending={isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
