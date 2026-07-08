"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/common/input";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import type { LookupOption } from "@/types/employee";

type PerformanceFiltersProps = {
  employees: LookupOption[];
  departments?: LookupOption[];
  cycles?: LookupOption[];
  statusItems?: { value: string; label: string }[];
  statusKey?: string;
  statusValue?: string;
  employeeId?: string;
  departmentId?: string;
  cycleId?: string;
  search?: string;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
};

export function PerformanceFilters({
  employees,
  departments,
  cycles,
  statusItems,
  statusKey = "status",
  statusValue,
  employeeId,
  departmentId,
  cycleId,
  search = "",
  searchPlaceholder = "Search...",
  extraFilters,
}: PerformanceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all") params.delete(key);
        else params.set(key, value);
      }
      params.set("page", "1");
      startTransition(() => router.push(`?${params.toString()}`));
    },
    [router, searchParams, startTransition],
  );

  return (
    <div className={`flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center ${isPending ? "opacity-70" : ""}`}>
      <div className="relative lg:w-[18rem]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          defaultValue={search}
          className="pl-9"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              updateParams({ search: (event.target as HTMLInputElement).value || undefined });
            }
          }}
        />
      </div>
      <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EmployeeSelect
          employees={[{ id: "all", label: "All employees" }, ...employees]}
          value={employeeId ?? "all"}
          onValueChange={(value) =>
            updateParams({ employeeId: value === "all" ? undefined : value })
          }
        />
        {departments ? (
          <LabeledSelect
            items={[{ value: "all", label: "All departments" }, ...departments.map((d) => ({ value: d.id, label: d.label }))]}
            value={departmentId ?? "all"}
            onValueChange={(value) =>
              updateParams({ departmentId: value === "all" ? undefined : value })
            }
            placeholder="Department"
          />
        ) : null}
        {cycles ? (
          <LabeledSelect
            items={[{ value: "all", label: "All cycles" }, ...cycles.map((c) => ({ value: c.id, label: c.label }))]}
            value={cycleId ?? "all"}
            onValueChange={(value) =>
              updateParams({ cycleId: value === "all" ? undefined : value })
            }
            placeholder="Review cycle"
          />
        ) : null}
        {statusItems ? (
          <LabeledSelect
            items={statusItems}
            value={statusValue ?? "all"}
            onValueChange={(value) =>
              updateParams({ [statusKey]: value === "all" ? undefined : value })
            }
            placeholder="Status"
          />
        ) : null}
        {extraFilters}
      </div>
    </div>
  );
}

export function buildStatusItems(
  labels: Record<string, string>,
  allLabel = "All statuses",
) {
  return [{ value: "all", label: allLabel }, ...toSelectItems(labels)];
}

export function PerformancePagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
