"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { PeoplePageSizeSelect } from "@/components/common/people-page-size-select";
import { deleteEmployeeAction, fetchEmployeesAction } from "@/lib/employees/actions";
import { resolveEmployeeModuleRoutes } from "@/lib/employees/constants";
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
  departments: LookupOption[];
  canEdit: boolean;
  canDelete: boolean;
  /** Serializable portal base (e.g. `/dashboard/system/employees`). Never pass route builders from RSC. */
  routesBasePath?: string;
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
  departments,
  canEdit,
  canDelete,
  routesBasePath,
}: EmployeeTableProps) {
  const routes = resolveEmployeeModuleRoutes(routesBasePath);
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
  });
  const [searchInput, setSearchInput] = useState(initialSearch ?? "");

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", routes.list);
    }
  }, [routes.list]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const nextFilters: EmployeeListParams = {
        ...filters,
        page: updates.page ? Number(updates.page) : filters.page,
      };

      if (updates.pageSize) {
        nextFilters.pageSize = Number(updates.pageSize);
        nextFilters.page = 1;
      }

      Object.entries(updates).forEach(([key, value]) => {
        if (
          key === "page" ||
          key === "pageSize" ||
          key === "departmentId" ||
          key === "branchId"
        ) {
          return;
        }
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

  useEffect(() => {
    const trimmed = searchInput.trim();
    const current = (filters.search ?? "").trim();
    if (trimmed === current) return;

    const timer = window.setTimeout(() => {
      updateParams({
        search: trimmed || undefined,
        page: "1",
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput, filters.search, updateParams]);

  const { employees, total, page, pageSize } = tableState;
  const { department } = filters;

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
      <div className="relative z-10 flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/55 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name, email, or code..."
            value={searchInput}
            className="h-10 border-border/80 bg-background font-semibold sm:max-w-xs"
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                updateParams({
                  search: event.currentTarget.value.trim() || undefined,
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
            <SelectTrigger className="h-10 w-full min-w-0 border-border/80 bg-background font-semibold sm:w-44">
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
        </div>
      </div>

      <div className={cn(isPending && "pointer-events-none opacity-70")}>
        <EmployeeCardsGrid
          employees={employees}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={setDeleteTarget}
          routesBasePath={routesBasePath}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground/80">
          Showing {employees.length === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, total)} of {total}
        </p>
        <PeoplePageSizeSelect
          value={pageSize}
          disabled={isPending}
          onChange={(nextSize) =>
            updateParams({ pageSize: String(nextSize), page: "1" })
          }
        />
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
