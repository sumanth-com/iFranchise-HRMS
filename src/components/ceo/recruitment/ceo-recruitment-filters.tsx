"use client";

import { RotateCcw, UserRound } from "lucide-react";

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
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
  MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import { CANDIDATE_STAGE_LABELS } from "@/lib/recruitment/constants";
import type {
  CeoRecruitmentFilterLookups,
  CeoRecruitmentListParams,
} from "@/types/ceo-recruitment";

type CeoRecruitmentFiltersProps = {
  filters: CeoRecruitmentListParams;
  lookups: CeoRecruitmentFilterLookups;
  onChange: (next: Partial<CeoRecruitmentListParams>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const CANDIDATE_LABEL = "All Candidates";
const DEPARTMENT_LABEL = "All Departments";
const JOB_LABEL = "All Jobs";
const STAGE_LABEL = "Any Stage";

const STAGE_FILTER_LABELS = {
  applied: CANDIDATE_STAGE_LABELS.applied,
  screening: CANDIDATE_STAGE_LABELS.screening,
  technical: "Technical Interview",
  hr: "HR Interview",
  ceo: "CEO Interview",
  offer: CANDIDATE_STAGE_LABELS.offer,
  joined: CANDIDATE_STAGE_LABELS.joined,
  rejected: CANDIDATE_STAGE_LABELS.rejected,
} as const;

export function CeoRecruitmentFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoRecruitmentFiltersProps) {
  const candidateValue = filters.candidateId ?? FILTER_ANY_VALUE;
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const jobValue = filters.jobOpeningId ?? FILTER_ANY_VALUE;
  const stageValue = filters.stage ?? FILTER_ANY_VALUE;

  const candidateOptions = lookups.candidates.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const jobOptions = lookups.jobs.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        <Select
          value={candidateValue}
          onValueChange={(value) =>
            onChange({
              candidateId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              search: undefined,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[11rem]">
            <UserRound className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={CANDIDATE_LABEL}>
              {filterSelectLabel(candidateValue, CANDIDATE_LABEL, candidateOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{CANDIDATE_LABEL}</SelectItem>
            {candidateOptions.map((item) => (
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
          value={jobValue}
          onValueChange={(value) =>
            onChange({
              jobOpeningId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[10rem]">
            <SelectValue placeholder={JOB_LABEL}>
              {filterSelectLabel(jobValue, JOB_LABEL, jobOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{JOB_LABEL}</SelectItem>
            {jobOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={stageValue}
          onValueChange={(value) =>
            onChange({
              stage:
                value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as CeoRecruitmentListParams["stage"]),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={STAGE_LABEL}>
              {filterSelectLabelFromMap(stageValue, STAGE_LABEL, STAGE_FILTER_LABELS)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{STAGE_LABEL}</SelectItem>
            {Object.entries(STAGE_FILTER_LABELS).map(([value, label]) => (
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
