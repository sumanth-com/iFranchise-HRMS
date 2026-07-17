"use client";

import { Building2, RotateCcw } from "lucide-react";

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
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type { CeoOrgFilterLookups, CeoOrgListParams } from "@/types/ceo-organization";

type CeoOrganizationFiltersProps = {
  filters: CeoOrgListParams;
  lookups: CeoOrgFilterLookups;
  onChange: (next: Partial<CeoOrgListParams>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const DEPARTMENT_LABEL = "All Departments";
const TYPE_LABEL = "All Types";

export function CeoOrganizationFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoOrganizationFiltersProps) {
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const employmentTypeValue = filters.employmentTypeId ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const employmentTypeOptions = lookups.employmentTypes.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[12rem]">
            <Building2 className="mr-2 size-4 shrink-0 text-muted-foreground" />
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
          value={employmentTypeValue}
          onValueChange={(value) =>
            onChange({
              employmentTypeId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[12rem]">
            <SelectValue placeholder={TYPE_LABEL}>
              {filterSelectLabel(employmentTypeValue, TYPE_LABEL, employmentTypeOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{TYPE_LABEL}</SelectItem>
            {employmentTypeOptions.map((item) => (
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
