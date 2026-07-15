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

const COMPARE_OPTIONS: { value: CeoAnalyticsCompareMode; label: string }[] = [
  { value: "none", label: "No comparison" },
  { value: "previous_month", label: "Current vs previous month" },
  { value: "previous_quarter", label: "Quarter vs quarter" },
  { value: "previous_year", label: "Year vs year" },
  { value: "department", label: "Department vs department" },
];

export function CeoAnalyticsFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoAnalyticsFiltersProps) {
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const branchValue = filters.branchId ?? FILTER_ANY_VALUE;
  const managerValue = filters.managerId ?? FILTER_ANY_VALUE;
  const employmentTypeValue = filters.employmentTypeId ?? FILTER_ANY_VALUE;
  const compareMode = filters.compareMode ?? "none";
  const compareDepartmentValue = filters.compareDepartmentId ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const branchOptions = lookups.branches.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const managerOptions = lookups.managers.map((item) => ({
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
        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
          disabled={disabled}
          aria-label="Date from"
        />
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
          disabled={disabled}
          aria-label="Date to"
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
          value={branchValue}
          onValueChange={(value) =>
            onChange({
              branchId: !value || value === FILTER_ANY_VALUE ? undefined : value,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every branch">
              {filterSelectLabel(branchValue, "Every branch", branchOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every branch</SelectItem>
            {branchOptions.map((item) => (
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
          value={employmentTypeValue}
          onValueChange={(value) =>
            onChange({
              employmentTypeId: !value || value === FILTER_ANY_VALUE ? undefined : value,
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
          value={compareMode}
          onValueChange={(value) =>
            onChange({
              compareMode: (value as CeoAnalyticsCompareMode) || "none",
              comparePreviousPeriod: value !== "none" && value !== "department",
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Comparison mode">
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
            <SelectTrigger>
              <SelectValue placeholder="Compare with department">
                {filterSelectLabel(
                  compareDepartmentValue,
                  "Compare with department",
                  departmentOptions,
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>Compare with department</SelectItem>
              {departmentOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={disabled}>
          <RotateCcw className="size-3.5" />
          Reset Filters
        </Button>
      </div>
    </section>
  );
}
