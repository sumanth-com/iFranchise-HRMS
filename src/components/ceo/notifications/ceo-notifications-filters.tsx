"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/common/button";
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

const CATEGORY_LABEL = "All Categories";
const PRIORITY_LABEL = "Any Priority";
const STATUS_LABEL = "Any Status";
const DEPARTMENT_LABEL = "All Departments";

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
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[11rem]">
            <SelectValue placeholder={CATEGORY_LABEL}>
              {filterSelectLabel(categoryValue, CATEGORY_LABEL, categoryOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{CATEGORY_LABEL}</SelectItem>
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={PRIORITY_LABEL}>
              {filterSelectLabelFromMap(priorityValue, PRIORITY_LABEL, PRIORITY_LABELS)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{PRIORITY_LABEL}</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={STATUS_LABEL}>
              {statusValue === FILTER_ANY_VALUE
                ? STATUS_LABEL
                : STATUS_OPTIONS.find((item) => item.value === statusValue)?.label ??
                  STATUS_LABEL}
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[10rem]">
            <SelectValue placeholder={DEPARTMENT_LABEL}>
              {filterSelectLabel(departmentValue, DEPARTMENT_LABEL, departmentOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{DEPARTMENT_LABEL}</SelectItem>
            {departmentOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="h-10 shrink-0 gap-1.5 px-3"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>
    </section>
  );
}
