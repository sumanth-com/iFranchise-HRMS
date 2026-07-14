"use client";

import { Users } from "lucide-react";

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
import { REVIEW_STATUS_LABELS, RATING_LABELS } from "@/lib/performance/constants";
import type {
  TeamPerformanceFilterLookups,
  TeamPerformanceListParams,
} from "@/types/manager-performance";

type ManagerPerformanceFiltersProps = {
  filters: TeamPerformanceListParams;
  lookups: TeamPerformanceFilterLookups;
  onChange: (next: Partial<TeamPerformanceListParams>) => void;
  disabled?: boolean;
};

const TEAM_MEMBER_LABEL = "Everyone on my team";
const REVIEW_CYCLE_LABEL = "Every review cycle";
const REVIEW_STATUS_LABEL = "Any review status";
const MIN_RATING_LABEL = "No minimum rating";

export function ManagerPerformanceFilters({
  filters,
  lookups,
  onChange,
  disabled,
}: ManagerPerformanceFiltersProps) {
  const employeeValue = filters.employeeId ?? FILTER_ANY_VALUE;
  const cycleValue = filters.cycleId ?? FILTER_ANY_VALUE;
  const reviewStatusValue = filters.reviewStatus ?? FILTER_ANY_VALUE;
  const minRatingValue = filters.minRating ? String(filters.minRating) : FILTER_ANY_VALUE;

  const employeeOptions = lookups.employees.map((employee) => ({
    value: employee.id,
    label: employee.label,
  }));

  const cycleOptions = lookups.cycles.map((cycle) => ({
    value: cycle.id,
    label: cycle.label,
  }));

  const ratingOptions = Object.fromEntries(
    Object.entries(RATING_LABELS).map(([value, label]) => [
      value,
      `${value}+ · ${label}`,
    ]),
  );

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <label
            htmlFor="performance-team-member"
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
            <SelectTrigger id="performance-team-member" className="w-full">
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
            htmlFor="performance-cycle"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Review cycle
          </label>
          <Select
            value={cycleValue}
            onValueChange={(value) =>
              onChange({
                cycleId: !value || value === FILTER_ANY_VALUE ? undefined : value,
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="performance-cycle" className="w-full">
              <SelectValue placeholder={REVIEW_CYCLE_LABEL}>
                {filterSelectLabel(cycleValue, REVIEW_CYCLE_LABEL, cycleOptions)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{REVIEW_CYCLE_LABEL}</SelectItem>
              {cycleOptions.map((cycle) => (
                <SelectItem key={cycle.value} value={cycle.value}>
                  {cycle.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="performance-review-status"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Review status
          </label>
          <Select
            value={reviewStatusValue}
            onValueChange={(value) =>
              onChange({
                reviewStatus:
                  value === FILTER_ANY_VALUE
                    ? undefined
                    : (value as TeamPerformanceListParams["reviewStatus"]),
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="performance-review-status" className="w-full">
              <SelectValue placeholder={REVIEW_STATUS_LABEL}>
                {filterSelectLabelFromMap(
                  reviewStatusValue,
                  REVIEW_STATUS_LABEL,
                  REVIEW_STATUS_LABELS,
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{REVIEW_STATUS_LABEL}</SelectItem>
              {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="performance-rating"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Minimum rating
          </label>
          <Select
            value={minRatingValue}
            onValueChange={(value) =>
              onChange({
                minRating: value === FILTER_ANY_VALUE ? undefined : Number(value),
                page: 1,
              })
            }
            disabled={disabled}
          >
            <SelectTrigger id="performance-rating" className="w-full">
              <SelectValue placeholder={MIN_RATING_LABEL}>
                {filterSelectLabelFromMap(minRatingValue, MIN_RATING_LABEL, ratingOptions)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
            >
              <SelectItem value={FILTER_ANY_VALUE}>{MIN_RATING_LABEL}</SelectItem>
              {Object.entries(ratingOptions).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
