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
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
  MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type {
  TeamRecruitmentListParams,
  TeamRecruitmentLookups,
} from "@/types/manager-recruitment";

type ManagerRecruitmentFiltersProps = {
  filters: TeamRecruitmentListParams;
  lookups: TeamRecruitmentLookups;
  onChange: (next: Partial<TeamRecruitmentListParams>) => void;
  disabled?: boolean;
};

const TEAM_MEMBER_LABEL = "Everyone on my team";
const JOB_OPENING_LABEL = "Every job opening";
const STAGE_LABEL = "Every interview stage";
const STATUS_LABEL = "Any interview status";
const DEPARTMENT_LABEL = "Every department";

export function ManagerRecruitmentFilters({
  filters,
  lookups,
  onChange,
  disabled,
}: ManagerRecruitmentFiltersProps) {
  const showDepartmentFilter = lookups.departments.length > 1;
  const employeeValue = filters.employeeId ?? FILTER_ANY_VALUE;
  const jobOpeningValue = filters.jobOpeningId ?? FILTER_ANY_VALUE;
  const stageValue = filters.stage ?? FILTER_ANY_VALUE;
  const interviewStatusValue = filters.interviewStatus ?? FILTER_ANY_VALUE;
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;

  const employeeOptions = lookups.employees.map((employee) => ({
    value: employee.id,
    label: employee.label,
  }));

  const jobOptions = lookups.jobs.map((job) => ({
    value: job.id,
    label: job.label,
  }));

  const stageOptions = lookups.stages.map((stage) => ({
    value: stage.id,
    label: stage.label,
  }));

  const interviewStatusOptions = lookups.interviewStatuses.map((status) => ({
    value: status.id,
    label: status.label,
  }));

  const departmentOptions = lookups.departments.map((department) => ({
    value: department.id,
    label: department.label,
  }));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div
        className={
          showDepartmentFilter
            ? "grid gap-3 xl:grid-cols-7"
            : "grid gap-3 xl:grid-cols-6"
        }
      >
        <div className="min-w-0 xl:col-span-1">
          <label
            htmlFor="recruitment-team-member"
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
            <SelectTrigger id="recruitment-team-member" className="w-full">
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
            htmlFor="recruitment-job-opening"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Job opening
          </label>
          <Select
            value={jobOpeningValue}
            onValueChange={(value) =>
              onChange({
                jobOpeningId: !value || value === FILTER_ANY_VALUE ? undefined : value,
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="recruitment-job-opening" className="w-full">
              <SelectValue placeholder={JOB_OPENING_LABEL}>
                {filterSelectLabel(jobOpeningValue, JOB_OPENING_LABEL, jobOptions)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{JOB_OPENING_LABEL}</SelectItem>
              {jobOptions.map((job) => (
                <SelectItem key={job.value} value={job.value}>
                  {job.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="recruitment-stage"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Interview stage
          </label>
          <Select
            value={stageValue}
            onValueChange={(value) =>
              onChange({
                stage:
                  value === FILTER_ANY_VALUE
                    ? undefined
                    : (value as TeamRecruitmentListParams["stage"]),
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="recruitment-stage" className="w-full">
              <SelectValue placeholder={STAGE_LABEL}>
                {filterSelectLabel(stageValue, STAGE_LABEL, stageOptions)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{STAGE_LABEL}</SelectItem>
              {stageOptions.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="recruitment-status"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Interview status
          </label>
          <Select
            value={interviewStatusValue}
            onValueChange={(value) =>
              onChange({
                interviewStatus:
                  value === FILTER_ANY_VALUE
                    ? undefined
                    : (value as TeamRecruitmentListParams["interviewStatus"]),
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="recruitment-status" className="w-full">
              <SelectValue placeholder={STATUS_LABEL}>
                {filterSelectLabel(interviewStatusValue, STATUS_LABEL, interviewStatusOptions)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{STATUS_LABEL}</SelectItem>
              {interviewStatusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showDepartmentFilter ? (
          <div className="min-w-0">
            <label
              htmlFor="recruitment-department"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Department
            </label>
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
              <SelectTrigger id="recruitment-department" className="w-full">
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
          </div>
        ) : null}

        <div className="min-w-0">
          <label
            htmlFor="recruitment-date-from"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="recruitment-date-from"
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
            htmlFor="recruitment-date-to"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="recruitment-date-to"
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
