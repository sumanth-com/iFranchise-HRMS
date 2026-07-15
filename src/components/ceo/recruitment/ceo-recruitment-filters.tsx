"use client";

import { RotateCcw, Search } from "lucide-react";

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
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const jobValue = filters.jobOpeningId ?? FILTER_ANY_VALUE;
  const recruiterValue = filters.recruiterId ?? FILTER_ANY_VALUE;
  const stageValue = filters.stage ?? FILTER_ANY_VALUE;
  const employmentTypeValue = filters.employmentTypeId ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const jobOptions = lookups.jobs.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const recruiterOptions = lookups.recruiters.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const employmentTypeOptions = lookups.employmentTypes.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(event) => onChange({ search: event.target.value, page: 1 })}
            placeholder="Search candidate..."
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
            <SelectValue placeholder="Every department">
              {filterSelectLabel(departmentValue, "Every department", departmentOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every department</SelectItem>
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
          <SelectTrigger>
            <SelectValue placeholder="Every job position">
              {filterSelectLabel(jobValue, "Every job position", jobOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every job position</SelectItem>
            {jobOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={recruiterValue}
          onValueChange={(value) =>
            onChange({
              recruiterId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every recruiter">
              {filterSelectLabel(recruiterValue, "Every recruiter", recruiterOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every recruiter</SelectItem>
            {recruiterOptions.map((item) => (
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
          <SelectTrigger>
            <SelectValue placeholder="Any hiring stage">
              {filterSelectLabelFromMap(stageValue, "Any hiring stage", STAGE_FILTER_LABELS)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Any hiring stage</SelectItem>
            {Object.entries(STAGE_FILTER_LABELS).map(([value, label]) => (
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
            <SelectValue placeholder="Every employment type">
              {filterSelectLabel(
                employmentTypeValue,
                "Every employment type",
                employmentTypeOptions,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every employment type</SelectItem>
            {employmentTypeOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <label
            htmlFor="ceo-recruitment-date-from"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="ceo-recruitment-date-from"
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

        <div>
          <label
            htmlFor="ceo-recruitment-date-to"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="ceo-recruitment-date-to"
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

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          Reset Filters
        </Button>
      </div>
    </section>
  );
}
