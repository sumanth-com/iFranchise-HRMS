"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Input } from "@/components/common/input";
import { FilterSelect } from "@/components/common/filter-select";
import { NotificationCenterTable } from "@/components/notifications/notification-center-table";
import {
  NOTIFICATION_MODULES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATIONS_ROUTES,
} from "@/lib/notifications/constants";
import { toEmployeeSelectItems, withSelectOption } from "@/components/payroll/select-utils";
import type { LookupOption } from "@/types/employee";
import type { NotificationListResult } from "@/types/notifications";

const STATUS_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

type Props = {
  result: NotificationListResult;
  employees: LookupOption[];
  showRecipient: boolean;
  filters: {
    employeeId?: string;
    module?: string;
    type?: string;
    priority?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  };
};

export function NotificationHistoryPanel({
  result,
  employees,
  showRecipient,
  filters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      router.push(`${NOTIFICATIONS_ROUTES.history}?${params.toString()}`);
    },
    [router, searchParams],
  );

  const employeeItems = useMemo(
    () =>
      withSelectOption(toEmployeeSelectItems(employees), {
        value: "all",
        label: "All employees",
      }),
    [employees],
  );
  const moduleItems = useMemo(
    () =>
      withSelectOption(
        NOTIFICATION_MODULES.map((mod) => ({ value: mod.value, label: mod.label })),
        { value: "all", label: "All modules" },
      ),
    [],
  );
  const priorityItems = useMemo(
    () =>
      withSelectOption(
        NOTIFICATION_PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
        { value: "all", label: "All priorities" },
      ),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        {showRecipient ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Employee</p>
            <FilterSelect
              items={employeeItems}
              value={filters.employeeId ?? "all"}
              placeholder="All employees"
              onValueChange={(v) =>
                setParams({ employeeId: v === "all" ? undefined : v, page: "1" })
              }
            />
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Module</p>
          <FilterSelect
            items={moduleItems}
            value={filters.module ?? "all"}
            placeholder="All modules"
            onValueChange={(v) => setParams({ module: v === "all" ? undefined : v, page: "1" })}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Priority</p>
          <FilterSelect
            items={priorityItems}
            value={filters.priority ?? "all"}
            placeholder="All priorities"
            onValueChange={(v) => setParams({ priority: v === "all" ? undefined : v, page: "1" })}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <FilterSelect
            items={STATUS_ITEMS}
            value={filters.status ?? "all"}
            placeholder="All statuses"
            onValueChange={(v) => setParams({ status: v === "all" ? undefined : v, page: "1" })}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">From</p>
          <Input
            type="date"
            defaultValue={filters.dateFrom}
            onChange={(e) => setParams({ dateFrom: e.target.value || undefined, page: "1" })}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">To</p>
          <Input
            type="date"
            defaultValue={filters.dateTo}
            onChange={(e) => setParams({ dateTo: e.target.value || undefined, page: "1" })}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <p className="text-xs font-medium text-muted-foreground">Search</p>
          <Input
            placeholder="Search title or message..."
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setParams({ search: e.currentTarget.value || undefined, page: "1" });
              }
            }}
          />
        </div>
      </div>

      <NotificationCenterTable
        result={result}
        tab="all"
        search={filters.search ?? ""}
        showRecipient={showRecipient}
      />
    </div>
  );
}
