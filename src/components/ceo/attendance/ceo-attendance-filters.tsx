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
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type {
  CeoAttendanceFilterLookups,
  CeoAttendanceListParams,
} from "@/types/ceo-attendance";

type CeoAttendanceFiltersProps = {
  filters: CeoAttendanceListParams;
  lookups: CeoAttendanceFilterLookups;
  onChange: (next: Partial<CeoAttendanceListParams>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const MONTH_LABELS: Record<string, string> = {
  "1": "January",
  "2": "February",
  "3": "March",
  "4": "April",
  "5": "May",
  "6": "June",
  "7": "July",
  "8": "August",
  "9": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

export function CeoAttendanceFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoAttendanceFiltersProps) {
  const now = new Date();
  const monthValue = String(filters.month ?? now.getMonth() + 1);
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const managerValue = filters.managerId ?? FILTER_ANY_VALUE;
  const locationValue = filters.branchId ?? FILTER_ANY_VALUE;
  const employmentTypeValue = filters.employmentTypeId ?? FILTER_ANY_VALUE;
  const statusValue = filters.attendanceStatus ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const managerOptions = lookups.managers.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const locationOptions = lookups.locations.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const employmentTypeOptions = lookups.employmentTypes.map((item) => ({
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
            placeholder="Search employee..."
            className="pl-9"
            disabled={disabled}
          />
        </div>

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
              {filterSelectLabel(departmentValue, "Every department", departmentOptions)}
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

        <Select
          value={managerValue}
          onValueChange={(value) =>
            onChange({
              managerId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every manager">
              {filterSelectLabel(managerValue, "Every manager", managerOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every manager</SelectItem>
            {managerOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={locationValue}
          onValueChange={(value) =>
            onChange({
              branchId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every location">
              {filterSelectLabel(locationValue, "Every location", locationOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every location</SelectItem>
            {locationOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={employmentTypeValue}
          onValueChange={(value) =>
            onChange({
              employmentTypeId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every employment type">
              {filterSelectLabel(
                employmentTypeValue,
                "Every employment type",
                employmentTypeOptions,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every employment type</SelectItem>
            {employmentTypeOptions.map((item) => (
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
              attendanceStatus:
                value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as CeoAttendanceListParams["attendanceStatus"]),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any attendance status">
              {filterSelectLabelFromMap(
                statusValue,
                "Any attendance status",
                ATTENDANCE_STATUS_LABELS,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Any attendance status</SelectItem>
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={monthValue}
          onValueChange={(value) =>
            onChange({
              month: value ? Number(value) : undefined,
              year: filters.year ?? now.getFullYear(),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Month">
              {MONTH_LABELS[monthValue] ?? "Month"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            {Object.entries(MONTH_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <label
            htmlFor="ceo-attendance-date-from"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="ceo-attendance-date-from"
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(event) =>
              onChange({
                dateFrom: event.target.value || undefined,
                page: 1,
              })
            }
            disabled={disabled}
          />
        </div>

        <div>
          <label
            htmlFor="ceo-attendance-date-to"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="ceo-attendance-date-to"
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(event) =>
              onChange({
                dateTo: event.target.value || undefined,
                page: 1,
              })
            }
            disabled={disabled}
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          Reset Filters
        </Button>
      </div>
    </section>
  );
}
