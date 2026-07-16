"use client";

import { RotateCcw, Users } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
  MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import { RATING_LABELS } from "@/lib/performance/constants";
import type {
  CeoPerformanceFilterLookups,
  CeoPerformanceListParams,
} from "@/types/ceo-performance";

type CeoPerformanceFiltersProps = {
  filters: CeoPerformanceListParams;
  lookups: CeoPerformanceFilterLookups;
  onChange: (next: Partial<CeoPerformanceListParams>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const EMPLOYEE_LABEL = "All Employees";
const DEPARTMENT_LABEL = "All Departments";
const MANAGER_LABEL = "All Managers";
const CYCLE_LABEL = "All Cycles";
const RATING_LABEL = "Any Rating";

const RATING_FILTER_LABELS = Object.fromEntries(
  Object.entries(RATING_LABELS).map(([value, label]) => [value, `${value} · ${label}`]),
) as Record<string, string>;

export function CeoPerformanceFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoPerformanceFiltersProps) {
  const employeeValue = filters.employeeId ?? FILTER_ANY_VALUE;
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const managerValue = filters.managerId ?? FILTER_ANY_VALUE;
  const cycleValue = filters.cycleId ?? FILTER_ANY_VALUE;
  const ratingValue =
    filters.rating != null ? String(filters.rating) : FILTER_ANY_VALUE;

  const employeeOptions = (lookups.employees ?? []).map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const managerOptions = lookups.managers.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const cycleOptions = lookups.cycles.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        <Select
          value={employeeValue}
          onValueChange={(value) =>
            onChange({
              employeeId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              search: undefined,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[11rem]">
            <Users className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={EMPLOYEE_LABEL}>
              {filterSelectLabel(employeeValue, EMPLOYEE_LABEL, employeeOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{EMPLOYEE_LABEL}</SelectItem>
            {employeeOptions.map((item) => (
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[10rem]">
            <SelectValue placeholder={MANAGER_LABEL}>
              {filterSelectLabel(managerValue, MANAGER_LABEL, managerOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{MANAGER_LABEL}</SelectItem>
            {managerOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={cycleValue}
          onValueChange={(value) =>
            onChange({
              cycleId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={CYCLE_LABEL}>
              {filterSelectLabel(cycleValue, CYCLE_LABEL, cycleOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{CYCLE_LABEL}</SelectItem>
            {cycleOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={ratingValue}
          onValueChange={(value) =>
            onChange({
              rating:
                !value || value === FILTER_ANY_VALUE ? undefined : Number(value),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={RATING_LABEL}>
              {filterSelectLabelFromMap(ratingValue, RATING_LABEL, RATING_FILTER_LABELS)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{RATING_LABEL}</SelectItem>
            {Object.entries(RATING_FILTER_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
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
