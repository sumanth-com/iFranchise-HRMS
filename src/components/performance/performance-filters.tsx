"use client";

import { format, isValid, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useMemo,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/common/input";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { getHrmsYearSelectItems } from "@/lib/date/hrms-year";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/types/employee";

const FILTER_TRIGGER = "h-9 w-full min-w-0";
const FILTER_CONTENT = "min-w-[18rem] w-max max-h-60";

export const PERFORMANCE_MONTH_ITEMS = [
  { value: "all", label: "All months" },
  ...Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: format(new Date(2026, index, 1), "MMMM"),
  })),
];

export function currentMonthValue() {
  return String(new Date().getMonth() + 1);
}

export function currentYearValue() {
  return String(new Date().getFullYear());
}

export function buildYearItems() {
  return getHrmsYearSelectItems({ includeAll: true });
}

export function matchesAssignedPeriod(
  isoDate: string | null | undefined,
  month: string,
  year: string,
) {
  if (month === "all" && year === "all") return true;
  if (!isoDate) return false;
  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) return false;
  if (month !== "all" && parsed.getMonth() + 1 !== Number(month)) return false;
  if (year !== "all" && parsed.getFullYear() !== Number(year)) return false;
  return true;
}

export function MonthYearFilterFields({
  month,
  year,
  onMonthChange,
  onYearChange,
}: {
  month: string;
  year: string;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
}) {
  const yearItems = useMemo(() => buildYearItems(), []);
  return (
    <div className="contents">
      <LabeledSelect
        items={PERFORMANCE_MONTH_ITEMS}
        value={month}
        onValueChange={onMonthChange}
        triggerClassName={FILTER_TRIGGER}
        contentClassName={FILTER_CONTENT}
      />
      <LabeledSelect
        items={yearItems}
        value={year}
        onValueChange={onYearChange}
        triggerClassName={FILTER_TRIGGER}
        contentClassName={FILTER_CONTENT}
      />
    </div>
  );
}

export type PerformanceFilterUpdates = Record<string, string | undefined>;

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
  extraFilters?: ReactNode;
  className?: string;
  /** Aligned single-row filter bar (search + dropdowns same height). */
  variant?: "default" | "bar";
  showEmployee?: boolean;
  showDepartment?: boolean;
  showCycle?: boolean;
  /**
   * When set, filters update in memory (no URL/server round-trip).
   * Use this for sub-200ms list responses.
   */
  onFiltersChange?: (updates: PerformanceFilterUpdates) => void;
};

function normalizeFilterValue(value: string | undefined) {
  if (!value || value === "all") return undefined;
  return value;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    rows: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    total,
    page: safePage,
    totalPages,
  };
}

export function matchesTextQuery(
  haystacks: Array<string | null | undefined>,
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((value) => (value ?? "").toLowerCase().includes(q));
}

type FiltersViewProps = PerformanceFiltersProps & {
  onUpdate: (updates: PerformanceFilterUpdates) => void;
  isPending?: boolean;
  isLocal: boolean;
};

function PerformanceFiltersView({
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
  className,
  variant = "default",
  showEmployee = true,
  showDepartment = true,
  showCycle = true,
  onUpdate,
  isPending = false,
  isLocal,
}: FiltersViewProps) {
  const searchField = (
    <div className="relative min-w-0">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={searchPlaceholder}
        {...(isLocal
          ? {
              value: search,
              onChange: (event: ChangeEvent<HTMLInputElement>) =>
                onUpdate({ search: event.target.value || undefined }),
            }
          : {
              defaultValue: search,
              onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") {
                  onUpdate({
                    search: event.currentTarget.value || undefined,
                  });
                }
              },
            })}
        className="h-9 pl-9"
      />
    </div>
  );

  const employeeField = (
    <EmployeeSelect
      employees={[{ id: "all", label: "All employees" }, ...(employees ?? [])]}
      value={employeeId ?? "all"}
      onValueChange={(value) =>
        onUpdate({ employeeId: value === "all" ? undefined : value })
      }
      triggerClassName={FILTER_TRIGGER}
      contentClassName={FILTER_CONTENT}
    />
  );

  const showDepartmentField = Boolean(showDepartment && departments);
  const departmentField = showDepartmentField ? (
    <LabeledSelect
      items={[
        { value: "all", label: "All departments" },
        ...(departments ?? []).map((d) => ({ value: d.id, label: d.label })),
      ]}
      value={departmentId ?? "all"}
      onValueChange={(value) =>
        onUpdate({ departmentId: value === "all" ? undefined : value })
      }
      placeholder="All departments"
      triggerClassName={FILTER_TRIGGER}
      contentClassName={FILTER_CONTENT}
    />
  ) : null;

  const showCycleField = Boolean(showCycle && cycles);
  const cycleField = showCycleField ? (
    <LabeledSelect
      items={[
        { value: "all", label: "All cycles" },
        ...(cycles ?? []).map((c) => ({ value: c.id, label: c.label })),
      ]}
      value={cycleId ?? "all"}
      onValueChange={(value) =>
        onUpdate({ cycleId: value === "all" ? undefined : value })
      }
      placeholder="All cycles"
      triggerClassName={FILTER_TRIGGER}
      contentClassName={FILTER_CONTENT}
    />
  ) : null;

  const statusField = statusItems ? (
    <LabeledSelect
      items={statusItems}
      value={statusValue ?? "all"}
      onValueChange={(value) =>
        onUpdate({ [statusKey]: value === "all" ? undefined : value })
      }
      placeholder="All statuses"
      triggerClassName={FILTER_TRIGGER}
      contentClassName={FILTER_CONTENT}
    />
  ) : null;

  const dropdownCount = [
    showEmployee,
    showDepartmentField,
    showCycleField,
    Boolean(statusItems),
    Boolean(extraFilters),
  ].filter(Boolean).length;

  const barGridClass =
    dropdownCount <= 2
      ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.5fr)_minmax(13rem,1.4fr)_minmax(10rem,1fr)]"
      : dropdownCount === 3
        ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.4fr)_minmax(12rem,1.2fr)_repeat(2,minmax(10rem,1fr))]"
        : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.3fr)_minmax(12rem,1.2fr)_repeat(3,minmax(9.5rem,1fr))]";

  if (variant === "bar") {
    return (
      <div
        className={cn(
          "grid items-center gap-3",
          barGridClass,
          !isLocal && isPending && "opacity-70",
          "transition-opacity duration-150",
          className,
        )}
      >
        {searchField}
        {showEmployee ? employeeField : null}
        {departmentField}
        {cycleField}
        {statusField}
        {extraFilters}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center",
        !isLocal && isPending && "opacity-70",
        "transition-opacity duration-150",
        className,
      )}
    >
      <div className="relative w-full lg:w-[18rem] lg:shrink-0">{searchField}</div>
      <div className="grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showEmployee ? employeeField : null}
        {departmentField}
        {cycleField}
        {statusField}
        {extraFilters}
      </div>
    </div>
  );
}

function PerformanceFiltersUrl(props: PerformanceFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onUpdate = useCallback(
    (updates: PerformanceFilterUpdates) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        const next = normalizeFilterValue(value);
        if (!next) params.delete(key);
        else params.set(key, next);
      }
      params.set("page", "1");
      startTransition(() => router.push(`?${params.toString()}`));
    },
    [router, searchParams, startTransition],
  );

  return (
    <PerformanceFiltersView
      {...props}
      onUpdate={onUpdate}
      isPending={isPending}
      isLocal={false}
    />
  );
}

export function PerformanceFilters(props: PerformanceFiltersProps) {
  if (props.onFiltersChange) {
    return (
      <PerformanceFiltersView
        {...props}
        onUpdate={(updates) => {
          const normalized: PerformanceFilterUpdates = {};
          for (const [key, value] of Object.entries(updates)) {
            normalized[key] = normalizeFilterValue(value);
          }
          props.onFiltersChange?.(normalized);
        }}
        isLocal
      />
    );
  }

  return <PerformanceFiltersUrl {...props} />;
}

export function buildStatusItems(
  labels: Record<string, string>,
  allLabel = "All statuses",
) {
  return [{ value: "all", label: allLabel }, ...toSelectItems(labels)];
}

function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function PerformancePaginationUrl({
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

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`?${params.toString()}`);
  }

  return (
    <PaginationControls
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={goToPage}
    />
  );
}

export function PerformancePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
}) {
  if (onPageChange) {
    return (
      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    );
  }

  return (
    <PerformancePaginationUrl page={page} pageSize={pageSize} total={total} />
  );
}
