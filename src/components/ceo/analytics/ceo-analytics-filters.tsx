"use client";

import { RotateCcw } from "lucide-react";

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
  FILTER_ANY_VALUE,
  filterSelectLabel,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type {
  CeoAnalyticsCompareMode,
  CeoAnalyticsFilterLookups,
  CeoAnalyticsListParams,
} from "@/types/ceo-analytics";

type CeoAnalyticsFiltersProps = {
  filters: CeoAnalyticsListParams;
  lookups: CeoAnalyticsFilterLookups;
  onChange: (next: Partial<CeoAnalyticsListParams>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const DEPARTMENT_LABEL = "All Departments";
const MANAGER_LABEL = "All Managers";

const COMPARE_OPTIONS: { value: CeoAnalyticsCompareMode; label: string }[] = [
  { value: "none", label: "No comparison" },
  { value: "previous_month", label: "vs Prev Month" },
  { value: "previous_quarter", label: "vs Prev Quarter" },
  { value: "previous_year", label: "vs Prev Year" },
  { value: "department", label: "Dept vs Dept" },
];

export function CeoAnalyticsFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoAnalyticsFiltersProps) {
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const managerValue = filters.managerId ?? FILTER_ANY_VALUE;
  const compareMode = filters.compareMode ?? "none";
  const compareDepartmentValue = filters.compareDepartmentId ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const managerOptions = lookups.managers.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
          disabled={disabled}
          aria-label="Date from"
          className="h-10 min-w-0 flex-1 basis-[9rem]"
        />
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
          disabled={disabled}
          aria-label="Date to"
          className="h-10 min-w-0 flex-1 basis-[9rem]"
        />

        <Select
          value={departmentValue}
          onValueChange={(value) =>
            onChange({
              departmentId: !value || value === FILTER_ANY_VALUE ? undefined : value,
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
          value={compareMode}
          onValueChange={(value) =>
            onChange({
              compareMode: value as CeoAnalyticsCompareMode,
              compareDepartmentId:
                value === "department" ? filters.compareDepartmentId : undefined,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[10rem]">
            <SelectValue placeholder="Compare">
              {COMPARE_OPTIONS.find((item) => item.value === compareMode)?.label ??
                "No comparison"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            {COMPARE_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {compareMode === "department" ? (
          <Select
            value={compareDepartmentValue}
            onValueChange={(value) =>
              onChange({
                compareDepartmentId:
                  !value || value === FILTER_ANY_VALUE ? undefined : value,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="h-10 min-w-0 flex-1 basis-[10rem]">
              <SelectValue placeholder="Compare Dept">
                {filterSelectLabel(
                  compareDepartmentValue,
                  "Compare Dept",
                  departmentOptions,
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>Compare Dept</SelectItem>
              {departmentOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

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
