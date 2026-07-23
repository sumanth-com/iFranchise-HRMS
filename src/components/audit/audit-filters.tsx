"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { FilterSelect } from "@/components/common/filter-select";
import { Input } from "@/components/common/input";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  AUDIT_ROUTES,
} from "@/lib/audit/constants";
import { toLookupSelectItems, withSelectOption } from "@/components/payroll/select-utils";

type Props = {
  filters: {
    search?: string;
    module?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  basePath?: string;
};

export function AuditFilters({ filters, basePath = AUDIT_ROUTES.logs }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const moduleItems = useMemo(
    () =>
      withSelectOption(
        AUDIT_MODULES.map((m) => ({ value: m.value, label: m.label })),
        { value: "all", label: "All modules" },
      ),
    [],
  );
  const actionItems = useMemo(
    () =>
      withSelectOption(
        AUDIT_ACTIONS.map((a) => ({ value: a.value, label: a.label })),
        { value: "all", label: "All actions" },
      ),
    [],
  );

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath],
  );

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
      <Input
        placeholder="Search..."
        defaultValue={filters.search}
        className="h-9 min-w-[160px] flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setParams({ search: e.currentTarget.value || undefined, page: "1" });
          }
        }}
      />
      <div className="w-[150px]">
        <FilterSelect
          items={moduleItems}
          value={filters.module ?? "all"}
          placeholder="Module"
          onValueChange={(v) => setParams({ module: v === "all" ? undefined : v, page: "1" })}
        />
      </div>
      <div className="w-[140px]">
        <FilterSelect
          items={actionItems}
          value={filters.action ?? "all"}
          placeholder="Action"
          onValueChange={(v) => setParams({ action: v === "all" ? undefined : v, page: "1" })}
        />
      </div>
      <Input
        type="date"
        defaultValue={filters.dateFrom}
        className="h-9 w-[150px]"
        aria-label="From date"
        onChange={(e) => setParams({ dateFrom: e.target.value || undefined, page: "1" })}
      />
      <Input
        type="date"
        defaultValue={filters.dateTo}
        className="h-9 w-[150px]"
        aria-label="To date"
        onChange={(e) => setParams({ dateTo: e.target.value || undefined, page: "1" })}
      />
    </div>
  );
}
