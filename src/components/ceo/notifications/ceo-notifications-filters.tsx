"use client";

import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  CEO_NOTIFICATION_CATEGORIES,
  CEO_NOTIFICATION_CATEGORY_LABELS,
} from "@/lib/ceo/ceo-notification-categories";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import { NOTIFICATION_PRIORITIES } from "@/lib/notifications/constants";
import type {
  CeoNotificationCategory,
  CeoNotificationFilterLookups,
  CeoNotificationListParams,
} from "@/types/ceo-notifications";
import type { NotificationPriority, NotificationStatus } from "@/types/notifications";

type Props = {
  filters: CeoNotificationListParams;
  lookups: CeoNotificationFilterLookups;
  onChange: (next: Partial<CeoNotificationListParams>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const STATUS_OPTIONS: { value: NotificationStatus; label: string }[] = [
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

const PRIORITY_LABELS = Object.fromEntries(
  NOTIFICATION_PRIORITIES.map((item) => [item.value, item.label]),
) as Record<string, string>;

export function CeoNotificationsFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: Props) {
  const categoryValue = filters.category ?? FILTER_ANY_VALUE;
  const priorityValue = filters.priority ?? FILTER_ANY_VALUE;
  const statusValue = filters.status ?? FILTER_ANY_VALUE;
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;

  const categoryOptions = CEO_NOTIFICATION_CATEGORIES.map((category) => ({
    value: category,
    label: CEO_NOTIFICATION_CATEGORY_LABELS[category],
  }));
  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(event) => onChange({ search: event.target.value, page: 1 })}
            placeholder="Search employee, department, category, title…"
            className="pl-9"
            disabled={disabled}
          />
        </div>

        <Select
          value={categoryValue}
          onValueChange={(value) =>
            onChange({
              category:
                !value || value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as CeoNotificationCategory),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every category">
              {filterSelectLabel(categoryValue, "Every category", categoryOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every category</SelectItem>
            {categoryOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityValue}
          onValueChange={(value) =>
            onChange({
              priority:
                !value || value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as NotificationPriority),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every priority">
              {filterSelectLabelFromMap(priorityValue, "Every priority", PRIORITY_LABELS)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every priority</SelectItem>
            {NOTIFICATION_PRIORITIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusValue}
          onValueChange={(value) =>
            onChange({
              status:
                !value || value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as NotificationStatus),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Active (excl. archived)">
              {filterSelectLabel(
                statusValue,
                "Active (excl. archived)",
                STATUS_OPTIONS,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Active (excl. archived)</SelectItem>
            {STATUS_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={departmentValue}
          onValueChange={(value) =>
            onChange({
              departmentId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every department">
              {filterSelectLabel(
                departmentValue,
                "Every department",
                departmentOptions,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every department</SelectItem>
            {departmentOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(event) =>
            onChange({
              dateFrom: event.target.value || undefined,
              page: 1,
            })
          }
          disabled={disabled}
          aria-label="Date from"
        />

        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(event) =>
            onChange({
              dateTo: event.target.value || undefined,
              page: 1,
            })
          }
          disabled={disabled}
          aria-label="Date to"
        />

        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onReset}
            disabled={disabled}
          >
            <RotateCcw className="size-4" />
            Reset Filters
          </Button>
        </div>
      </div>
    </section>
  );
}
