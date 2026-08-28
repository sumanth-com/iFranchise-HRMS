"use client";

import { SectionHelpButton } from "@/components/common/section-help-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  EXECUTIVE_APPROVAL_PRIORITY_LABELS,
  EXECUTIVE_APPROVAL_STATUS_LABELS,
} from "@/lib/ceo/executive-approvals-constants";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type {
  CeoApprovalsFilterLookups,
  CeoApprovalsListParams,
  ExecutiveApprovalPriority,
  ExecutiveApprovalStatus,
} from "@/types/ceo-approvals";
import {
  CEO_APPROVALS_SECTION_HELP,
  CEO_SECTION_HELP_DESCRIPTION,
} from "@/lib/ceo/section-help";

type CeoApprovalsFiltersProps = {
  filters: CeoApprovalsListParams;
  lookups: CeoApprovalsFilterLookups;
  onChange: (next: Partial<CeoApprovalsListParams>) => void;
};

const PRIORITY_LABEL = "Any Priority";
const STATUS_LABEL = "Any Status";
const DEPARTMENT_LABEL = "All Departments";

const CEO_STATUS_FILTERS: ExecutiveApprovalStatus[] = [
  "pending_ceo",
  "escalated",
  "approved",
  "rejected",
];

export function CeoApprovalsFilters({
  filters,
  lookups,
  onChange,
}: CeoApprovalsFiltersProps) {
  const priorityValue = filters.priority ?? FILTER_ANY_VALUE;
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const statusValue = filters.status ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  return (
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="mb-3">
        <SectionHelpButton
          title={CEO_APPROVALS_SECTION_HELP.filters.title}
          points={[...CEO_APPROVALS_SECTION_HELP.filters.points]}
          description={CEO_SECTION_HELP_DESCRIPTION}
        >
          <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        </SectionHelpButton>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        <Select
          value={priorityValue}
          onValueChange={(value) =>
            onChange({
              priority:
                !value || value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as ExecutiveApprovalPriority),
              page: 1,
            })
          }
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={PRIORITY_LABEL}>
              {filterSelectLabelFromMap(
                priorityValue,
                PRIORITY_LABEL,
                EXECUTIVE_APPROVAL_PRIORITY_LABELS,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{PRIORITY_LABEL}</SelectItem>
            {(
              Object.entries(EXECUTIVE_APPROVAL_PRIORITY_LABELS) as [
                ExecutiveApprovalPriority,
                string,
              ][]
            ).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusValue}
          onValueChange={(value) =>
            onChange({
              status:
                !value || value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as ExecutiveApprovalStatus),
              page: 1,
            })
          }
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={STATUS_LABEL}>
              {filterSelectLabelFromMap(
                statusValue,
                STATUS_LABEL,
                EXECUTIVE_APPROVAL_STATUS_LABELS,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{STATUS_LABEL}</SelectItem>
            {CEO_STATUS_FILTERS.map((value) => (
              <SelectItem key={value} value={value}>
                {EXECUTIVE_APPROVAL_STATUS_LABELS[value]}
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
      </div>
    </section>
  );
}
