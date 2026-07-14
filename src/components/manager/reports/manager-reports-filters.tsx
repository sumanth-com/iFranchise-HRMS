"use client";

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
  MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type { ManagerReportsListParams } from "@/types/manager-reports";
import type { ReportsLookups } from "@/types/reports";

type ManagerReportsFiltersProps = {
  filters: ManagerReportsListParams;
  lookups: ReportsLookups;
  onChange: (next: Partial<ManagerReportsListParams>) => void;
  disabled?: boolean;
};

const TEAM_MEMBER_LABEL = "Everyone on my team";
const DEPARTMENT_LABEL = "Every department";

export function ManagerReportsFilters({
  filters,
  lookups,
  onChange,
  disabled,
}: ManagerReportsFiltersProps) {
  const showDepartmentFilter = lookups.departments.length > 1;
  const employeeValue = filters.employeeId ?? FILTER_ANY_VALUE;
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;

  const employeeOptions = lookups.employees.map((employee) => ({
    value: employee.id,
    label: employee.label,
  }));

  const departmentOptions = lookups.departments.map((department) => ({
    value: department.id,
    label: department.label,
  }));

  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
      <Select
        value={employeeValue}
        onValueChange={(value) =>
          onChange({
            employeeId: !value || value === FILTER_ANY_VALUE ? undefined : value,
          })
        }
        disabled={disabled}
      >
        <SelectTrigger className="md:col-span-2">
          <SelectValue placeholder={TEAM_MEMBER_LABEL}>
            {filterSelectLabel(employeeValue, TEAM_MEMBER_LABEL, employeeOptions)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          className={MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS}
        >
          <SelectItem value={FILTER_ANY_VALUE}>{TEAM_MEMBER_LABEL}</SelectItem>
          {employeeOptions.map((employee) => (
            <SelectItem key={employee.value} value={employee.value}>
              {employee.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showDepartmentFilter ? (
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
      ) : null}

      <Input
        type="month"
        value={
          filters.month && filters.year
            ? `${filters.year}-${String(filters.month).padStart(2, "0")}`
            : ""
        }
        onChange={(event) => {
          if (!event.target.value) {
            onChange({ month: undefined, year: undefined });
            return;
          }
          const [year, month] = event.target.value.split("-");
          onChange({ year: Number(year), month: Number(month) });
        }}
        disabled={disabled}
        aria-label="Month"
      />

      <Input
        type="date"
        value={filters.dateFrom ?? ""}
        onChange={(event) =>
          onChange({
            dateFrom: event.target.value || undefined,
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
          })
        }
        disabled={disabled}
        aria-label="Date to"
      />
    </section>
  );
}
