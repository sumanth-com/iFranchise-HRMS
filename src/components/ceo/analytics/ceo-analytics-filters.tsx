"use client";

import { SectionHelpButton } from "@/components/common/section-help-button";
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
import {
  CEO_ANALYTICS_SECTION_HELP,
  CEO_SECTION_HELP_DESCRIPTION,
} from "@/lib/ceo/section-help";
import type {
  CeoAnalyticsFilterLookups,
  CeoAnalyticsListParams,
} from "@/types/ceo-analytics";

type CeoAnalyticsFiltersProps = {
  filters: CeoAnalyticsListParams;
  lookups: CeoAnalyticsFilterLookups;
  onChange: (next: Partial<CeoAnalyticsListParams>) => void;
};

const DEPARTMENT_LABEL = "All Departments";
const MANAGER_LABEL = "All Managers";

export function CeoAnalyticsFilters({
  filters,
  lookups,
  onChange,
}: CeoAnalyticsFiltersProps) {
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const managerValue = filters.managerId ?? FILTER_ANY_VALUE;

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
      <div className="mb-3">
        <SectionHelpButton
          title={CEO_ANALYTICS_SECTION_HELP.filters.title}
          points={[...CEO_ANALYTICS_SECTION_HELP.filters.points]}
          description={CEO_SECTION_HELP_DESCRIPTION}
        >
          <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        </SectionHelpButton>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
          aria-label="Date from"
          className="h-10 min-w-0 flex-1 basis-[9rem]"
        />
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
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
      </div>
    </section>
  );
}
