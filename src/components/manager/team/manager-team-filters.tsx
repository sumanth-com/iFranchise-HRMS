"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/employees/constants";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type { TeamFilterLookups, TeamListParams } from "@/types/manager-team";

type ManagerTeamFiltersProps = {
  filters: TeamListParams;
  lookups: TeamFilterLookups;
  onChange: (next: Partial<TeamListParams>) => void;
  disabled?: boolean;
};

const DEPARTMENT_LABEL = "Every department";
const DESIGNATION_LABEL = "Every designation";
const EMPLOYMENT_STATUS_LABEL = "Any employment status";
const EMPLOYMENT_TYPE_LABEL = "Every employment type";

export function ManagerTeamFilters({
  filters,
  lookups,
  onChange,
  disabled,
}: ManagerTeamFiltersProps) {
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const designationValue = filters.designationId ?? FILTER_ANY_VALUE;
  const employmentStatusValue = filters.employmentStatus ?? FILTER_ANY_VALUE;
  const employmentTypeValue = filters.employmentTypeId ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((department) => ({
    value: department.id,
    label: department.label,
  }));

  const designationOptions = lookups.designations.map((designation) => ({
    value: designation.id,
    label: designation.label,
  }));

  const employmentTypeOptions = lookups.employmentTypes.map((employmentType) => ({
    value: employmentType.id,
    label: employmentType.label,
  }));

  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
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
          <SelectValue placeholder={DEPARTMENT_LABEL}>
            {filterSelectLabel(departmentValue, DEPARTMENT_LABEL, departmentOptions)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
        >
          <SelectItem value={FILTER_ANY_VALUE}>{DEPARTMENT_LABEL}</SelectItem>
          {departmentOptions.map((department) => (
            <SelectItem key={department.value} value={department.value}>
              {department.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={designationValue}
        onValueChange={(value) =>
          onChange({
            designationId: !value || value === FILTER_ANY_VALUE ? undefined : value,
            page: 1,
          })
        }
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={DESIGNATION_LABEL}>
            {filterSelectLabel(designationValue, DESIGNATION_LABEL, designationOptions)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
        >
          <SelectItem value={FILTER_ANY_VALUE}>{DESIGNATION_LABEL}</SelectItem>
          {designationOptions.map((designation) => (
            <SelectItem key={designation.value} value={designation.value}>
              {designation.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={employmentStatusValue}
        onValueChange={(value) =>
          onChange({
            employmentStatus:
              value === FILTER_ANY_VALUE
                ? undefined
                : (value as TeamListParams["employmentStatus"]),
            page: 1,
          })
        }
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={EMPLOYMENT_STATUS_LABEL}>
            {filterSelectLabelFromMap(
              employmentStatusValue,
              EMPLOYMENT_STATUS_LABEL,
              EMPLOYMENT_STATUS_LABELS,
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
        >
          <SelectItem value={FILTER_ANY_VALUE}>{EMPLOYMENT_STATUS_LABEL}</SelectItem>
          {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
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
          <SelectValue placeholder={EMPLOYMENT_TYPE_LABEL}>
            {filterSelectLabel(employmentTypeValue, EMPLOYMENT_TYPE_LABEL, employmentTypeOptions)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
        >
          <SelectItem value={FILTER_ANY_VALUE}>{EMPLOYMENT_TYPE_LABEL}</SelectItem>
          {employmentTypeOptions.map((employmentType) => (
            <SelectItem key={employmentType.value} value={employmentType.value}>
              {employmentType.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  );
}
