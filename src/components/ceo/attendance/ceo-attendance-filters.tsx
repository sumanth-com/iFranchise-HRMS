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
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
  MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS,
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

const EMPLOYEE_LABEL = "All Employees";
const DEPARTMENT_LABEL = "All Departments";
const STATUS_LABEL = "Any Status";

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
  const employeeValue = filters.employeeId ?? FILTER_ANY_VALUE;
  const monthValue = String(filters.month ?? now.getMonth() + 1);
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const statusValue = filters.attendanceStatus ?? FILTER_ANY_VALUE;

  const employeeOptions = (lookups.employees ?? []).map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const departmentOptions = lookups.departments.map((item) => ({
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={STATUS_LABEL}>
              {filterSelectLabelFromMap(
                statusValue,
                STATUS_LABEL,
                ATTENDANCE_STATUS_LABELS,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{STATUS_LABEL}</SelectItem>
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
            onChange({ month: value ? Number(value) : undefined, page: 1 })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[8rem]">
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
