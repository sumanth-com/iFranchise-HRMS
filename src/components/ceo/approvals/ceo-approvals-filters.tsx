"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/common/button";
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
  EXECUTIVE_APPROVAL_TYPE_LABELS,
  EXECUTIVE_APPROVAL_TYPES,
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
  ExecutiveApprovalType,
} from "@/types/ceo-approvals";

type CeoApprovalsFiltersProps = {
  filters: CeoApprovalsListParams;
  lookups: CeoApprovalsFilterLookups;
  onChange: (next: Partial<CeoApprovalsListParams>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const TYPE_LABEL = "All Types";
const PRIORITY_LABEL = "Any Priority";
const STATUS_LABEL = "Any Status";
const DEPARTMENT_LABEL = "All Departments";

export function CeoApprovalsFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoApprovalsFiltersProps) {
  const typeValue = filters.approvalType ?? FILTER_ANY_VALUE;
  const priorityValue = filters.priority ?? FILTER_ANY_VALUE;
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const statusValue = filters.status ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const typeOptions = EXECUTIVE_APPROVAL_TYPES.map((type) => ({
    value: type,
    label: EXECUTIVE_APPROVAL_TYPE_LABELS[type],
  }));

  return (
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
        <Select
          value={typeValue}
          onValueChange={(value) =>
            onChange({
              approvalType:
                !value || value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as ExecutiveApprovalType),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[10rem]">
            <SelectValue placeholder={TYPE_LABEL}>
              {filterSelectLabel(typeValue, TYPE_LABEL, typeOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{TYPE_LABEL}</SelectItem>
            {typeOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
          disabled={disabled}
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
          disabled={disabled}
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
            {(
              Object.entries(EXECUTIVE_APPROVAL_STATUS_LABELS) as [
                ExecutiveApprovalStatus,
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
