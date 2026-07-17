"use client";

import { Building2, RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";

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
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import { LEAVE_STATUS_LABELS } from "@/lib/leave/constants";
import type { CeoLeaveFilters } from "@/types/ceo-leave";
import type { LeaveLookups, LeaveStatus } from "@/types/leave";

type CeoLeaveFiltersProps = {
  filters: CeoLeaveFilters;
  lookups: LeaveLookups;
  onChange: (next: Partial<CeoLeaveFilters>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const STATUS_OPTIONS: LeaveStatus[] = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "withdrawn",
];

const ALL_DEPARTMENTS = "All Departments";
const ALL_TYPES = "All Leave Types";
const ALL_STATUS = "All Status";
const ALL_MANAGERS = "All Managers";

export function CeoLeaveFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoLeaveFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search ?? "");

  useEffect(() => {
    setSearchValue(filters.search ?? "");
  }, [filters.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = searchValue.trim();
      if (trimmed === (filters.search ?? "")) return;
      onChange({ search: trimmed.length > 0 ? trimmed : undefined });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const typeOptions = lookups.leaveTypes.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const managerOptions = lookups.managers.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const statusLabels: Record<string, string> = STATUS_OPTIONS.reduce(
    (acc, status) => ({ ...acc, [status]: LEAVE_STATUS_LABELS[status] }),
    {},
  );

  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const typeValue = filters.leaveTypeId ?? FILTER_ANY_VALUE;
  const statusValue = filters.leaveStatus ?? FILTER_ANY_VALUE;
  const managerValue = filters.reportingManagerId ?? FILTER_ANY_VALUE;

  const toValue = (value: string | null) =>
    !value || value === FILTER_ANY_VALUE ? undefined : value;

  const hasActiveFilters =
    Boolean(filters.departmentId) ||
    Boolean(filters.leaveTypeId) ||
    Boolean(filters.leaveStatus) ||
    Boolean(filters.reportingManagerId) ||
    Boolean(filters.search);

  return (
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-2.5">
        <div className="relative min-w-0 flex-1 basis-[13rem] lg:basis-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.currentTarget.value)}
            placeholder="Search employee…"
            disabled={disabled}
            className="h-10 pl-8"
          />
        </div>

        <Select
          value={departmentValue}
          onValueChange={(value) => onChange({ departmentId: toValue(value) })}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[10rem] lg:basis-0">
            <Building2 className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={ALL_DEPARTMENTS}>
              {filterSelectLabel(departmentValue, ALL_DEPARTMENTS, departmentOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{ALL_DEPARTMENTS}</SelectItem>
            {departmentOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeValue}
          onValueChange={(value) => onChange({ leaveTypeId: toValue(value) })}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem] lg:basis-0">
            <SelectValue placeholder={ALL_TYPES}>
              {filterSelectLabel(typeValue, ALL_TYPES, typeOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{ALL_TYPES}</SelectItem>
            {typeOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusValue}
          onValueChange={(value) =>
            onChange({ leaveStatus: toValue(value) as LeaveStatus | undefined })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[8rem] lg:basis-0">
            <SelectValue placeholder={ALL_STATUS}>
              {filterSelectLabelFromMap(statusValue, ALL_STATUS, statusLabels)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{ALL_STATUS}</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {LEAVE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={managerValue}
          onValueChange={(value) => onChange({ reportingManagerId: toValue(value) })}
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[10rem] lg:basis-0">
            <SelectValue placeholder={ALL_MANAGERS}>
              {filterSelectLabel(managerValue, ALL_MANAGERS, managerOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{ALL_MANAGERS}</SelectItem>
            {managerOptions.map((item) => (
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
          disabled={disabled || !hasActiveFilters}
          className="h-10 shrink-0 gap-1.5 px-3"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>
    </section>
  );
}
