"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { NotificationHistoryTimeline } from "@/components/notifications/notification-history-timeline";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import {
  NOTIFICATION_MODULES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATIONS_ROUTES,
} from "@/lib/notifications/constants";
import { toEmployeeSelectItems } from "@/components/payroll/select-utils";
import type { LookupOption } from "@/types/employee";
import type { NotificationListResult } from "@/types/notifications";

const MODULE_LABEL = "Every module";
const PRIORITY_LABEL = "Any priority";
const STATUS_LABEL = "Any status";
const EMPLOYEE_LABEL = "Everyone";

const STATUS_OPTIONS = [
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
  historyPath?: string;
};

export function NotificationHistoryPanel({
  result,
  employees,
  showRecipient,
  filters,
  historyPath = NOTIFICATIONS_ROUTES.history,
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
      router.push(`${historyPath}?${params.toString()}`);
    },
    [historyPath, router, searchParams],
  );

  const moduleValue = filters.module ?? FILTER_ANY_VALUE;
  const priorityValue = filters.priority ?? FILTER_ANY_VALUE;
  const statusValue = filters.status ?? FILTER_ANY_VALUE;
  const employeeValue = filters.employeeId ?? FILTER_ANY_VALUE;

  const moduleOptions = useMemo(
    () =>
      NOTIFICATION_MODULES.map((mod) => ({
        value: mod.value,
        label: mod.label,
      })),
    [],
  );

  const priorityOptions = useMemo(
    () =>
      NOTIFICATION_PRIORITIES.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [],
  );

  const employeeOptions = useMemo(
    () =>
      toEmployeeSelectItems(employees).map((item) => ({
        value: item.value,
        label: item.label,
      })),
    [employees],
  );

  const moduleLabels = useMemo(
    () => Object.fromEntries(moduleOptions.map((item) => [item.value, item.label])),
    [moduleOptions],
  );

  const priorityLabels = useMemo(
    () => Object.fromEntries(priorityOptions.map((item) => [item.value, item.label])),
    [priorityOptions],
  );

  const statusLabels = useMemo(
    () => Object.fromEntries(STATUS_OPTIONS.map((item) => [item.value, item.label])),
    [],
  );

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <div
          className={
            showRecipient
              ? "grid grid-cols-2 gap-2 xl:grid-cols-7"
              : "grid grid-cols-2 gap-2 xl:grid-cols-6"
          }
        >
          {showRecipient ? (
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Employee
              </label>
              <Select
                value={employeeValue}
                onValueChange={(value) =>
                  setParams({
                    employeeId: !value || value === FILTER_ANY_VALUE ? undefined : value,
                    page: "1",
                    id: undefined,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={EMPLOYEE_LABEL}>
                    {filterSelectLabel(employeeValue, EMPLOYEE_LABEL, employeeOptions)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
                >
                  <SelectItem value={FILTER_ANY_VALUE}>{EMPLOYEE_LABEL}</SelectItem>
                  {employeeOptions.map((employee) => (
                    <SelectItem key={employee.value} value={employee.value}>
                      {employee.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Module</label>
            <Select
              value={moduleValue}
              onValueChange={(value) =>
                setParams({
                  module: !value || value === FILTER_ANY_VALUE ? undefined : value,
                  page: "1",
                  id: undefined,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={MODULE_LABEL}>
                  {filterSelectLabelFromMap(moduleValue, MODULE_LABEL, moduleLabels)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
              >
                <SelectItem value={FILTER_ANY_VALUE}>{MODULE_LABEL}</SelectItem>
                {moduleOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Priority
            </label>
            <Select
              value={priorityValue}
              onValueChange={(value) =>
                setParams({
                  priority: !value || value === FILTER_ANY_VALUE ? undefined : value,
                  page: "1",
                  id: undefined,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={PRIORITY_LABEL}>
                  {filterSelectLabelFromMap(priorityValue, PRIORITY_LABEL, priorityLabels)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
              >
                <SelectItem value={FILTER_ANY_VALUE}>{PRIORITY_LABEL}</SelectItem>
                {priorityOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <Select
              value={statusValue}
              onValueChange={(value) =>
                setParams({
                  status: !value || value === FILTER_ANY_VALUE ? undefined : value,
                  page: "1",
                  id: undefined,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={STATUS_LABEL}>
                  {filterSelectLabelFromMap(statusValue, STATUS_LABEL, statusLabels)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
              >
                <SelectItem value={FILTER_ANY_VALUE}>{STATUS_LABEL}</SelectItem>
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
            <Input
              type="date"
              className="w-full"
              defaultValue={filters.dateFrom}
              onChange={(event) =>
                setParams({ dateFrom: event.target.value || undefined, page: "1", id: undefined })
              }
            />
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
            <Input
              type="date"
              className="w-full"
              defaultValue={filters.dateTo}
              onChange={(event) =>
                setParams({ dateTo: event.target.value || undefined, page: "1", id: undefined })
              }
            />
          </div>

          <div className="col-span-2 min-w-0 xl:col-span-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
            <Input
              placeholder="Title or message..."
              className="w-full"
              defaultValue={filters.search}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setParams({
                    search: event.currentTarget.value || undefined,
                    page: "1",
                    id: undefined,
                  });
                }
              }}
            />
          </div>
        </div>
      </div>

      <NotificationHistoryTimeline
        result={result}
        historyPath={historyPath}
        showRecipient={showRecipient}
      />
    </div>
  );
}
