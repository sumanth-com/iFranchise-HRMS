"use client";

import { format, parseISO } from "date-fns";
import { Users } from "lucide-react";

import { Input } from "@/components/common/input";
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
  TeamAttendanceFilterLookups,
  TeamAttendanceListParams,
} from "@/types/manager-attendance";

type ManagerAttendanceFiltersProps = {
  filters: TeamAttendanceListParams;
  lookups: TeamAttendanceFilterLookups;
  today: string;
  onChange: (next: Partial<TeamAttendanceListParams>) => void;
  disabled?: boolean;
};

const TEAM_MEMBER_LABEL = "Everyone on my team";
const STATUS_LABEL = "Any status";

export function ManagerAttendanceFilters({
  filters,
  lookups,
  today,
  onChange,
  disabled,
}: ManagerAttendanceFiltersProps) {
  const selectedDate = filters.dateFrom ?? today;
  const employeeValue = filters.employeeId ?? FILTER_ANY_VALUE;
  const statusValue = filters.attendanceStatus ?? FILTER_ANY_VALUE;

  const memberOptions = lookups.teamMembers.map((member) => ({
    value: member.id,
    label: member.code ? `${member.label} · ${member.code}` : member.label,
  }));

  const selectedMember = memberOptions.find((member) => member.value === filters.employeeId);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <label
            htmlFor="team-member-filter"
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
            <SelectTrigger id="team-member-filter" className="w-full">
              <Users className="mr-2 size-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder={TEAM_MEMBER_LABEL}>
                {filterSelectLabel(employeeValue, TEAM_MEMBER_LABEL, memberOptions)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{TEAM_MEMBER_LABEL}</SelectItem>
              {memberOptions.map((member) => (
                <SelectItem key={member.value} value={member.value}>
                  {member.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="attendance-date"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Date
          </label>
          <Input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(event) => {
              const value = event.target.value || undefined;
              onChange({
                dateFrom: value,
                dateTo: value,
                page: 1,
              });
            }}
            disabled={disabled}
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="attendance-status"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <Select
            value={statusValue}
            onValueChange={(value) =>
              onChange({
                attendanceStatus:
                  value === FILTER_ANY_VALUE
                    ? undefined
                    : (value as TeamAttendanceListParams["attendanceStatus"]),
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="attendance-status" className="w-full">
              <SelectValue placeholder={STATUS_LABEL}>
                {filterSelectLabelFromMap(statusValue, STATUS_LABEL, ATTENDANCE_STATUS_LABELS)}
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
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing attendance for {format(parseISO(selectedDate), "EEEE, d MMM yyyy")}
        {selectedMember ? ` · ${selectedMember.label}` : " · everyone on my team"}
      </p>
    </section>
  );
}
