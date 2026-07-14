"use client";

import { Users } from "lucide-react";

import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { LEAVE_STATUS_LABELS } from "@/lib/leave/constants";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
  MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type {
  TeamLeaveFilterLookups,
  TeamLeaveListParams,
} from "@/types/manager-leave";

type ManagerLeaveFiltersProps = {
  filters: TeamLeaveListParams;
  lookups: TeamLeaveFilterLookups;
  onChange: (next: Partial<TeamLeaveListParams>) => void;
  disabled?: boolean;
};

const TEAM_MEMBER_LABEL = "Everyone on my team";
const LEAVE_TYPE_LABEL = "Every leave type";
const STATUS_LABEL = "Any status";

export function ManagerLeaveFilters({
  filters,
  lookups,
  onChange,
  disabled,
}: ManagerLeaveFiltersProps) {
  const employeeValue = filters.employeeId ?? FILTER_ANY_VALUE;
  const leaveTypeValue = filters.leaveTypeId ?? FILTER_ANY_VALUE;
  const leaveStatusValue = filters.leaveStatus ?? FILTER_ANY_VALUE;

  const employeeOptions = lookups.employees.map((employee) => ({
    value: employee.id,
    label: employee.label,
  }));

  const leaveTypeOptions = lookups.leaveTypes.map((leaveType) => ({
    value: leaveType.id,
    label: leaveType.label,
  }));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="min-w-0">
          <label
            htmlFor="leave-team-member"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Team member
          </label>
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
            <SelectTrigger id="leave-team-member" className="w-full">
              <Users className="mr-2 size-4 shrink-0 text-muted-foreground" />
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
        </div>

        <div className="min-w-0">
          <label
            htmlFor="leave-type-filter"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Leave type
          </label>
          <Select
            value={leaveTypeValue}
            onValueChange={(value) =>
              onChange({
                leaveTypeId: !value || value === FILTER_ANY_VALUE ? undefined : value,
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="leave-type-filter" className="w-full">
              <SelectValue placeholder={LEAVE_TYPE_LABEL}>
                {filterSelectLabel(leaveTypeValue, LEAVE_TYPE_LABEL, leaveTypeOptions)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{LEAVE_TYPE_LABEL}</SelectItem>
              {leaveTypeOptions.map((leaveType) => (
                <SelectItem key={leaveType.value} value={leaveType.value}>
                  {leaveType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="leave-status-filter"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <Select
            value={leaveStatusValue}
            onValueChange={(value) =>
              onChange({
                leaveStatus:
                  value === FILTER_ANY_VALUE
                    ? undefined
                    : (value as TeamLeaveListParams["leaveStatus"]),
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="leave-status-filter" className="w-full">
              <SelectValue placeholder={STATUS_LABEL}>
                {filterSelectLabelFromMap(leaveStatusValue, STATUS_LABEL, LEAVE_STATUS_LABELS)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{STATUS_LABEL}</SelectItem>
              {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="leave-date-from"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="leave-date-from"
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

        <div className="min-w-0">
          <label
            htmlFor="leave-date-to"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="leave-date-to"
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
    </section>
  );
}
