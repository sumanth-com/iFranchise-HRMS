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

const STATUS_OPTIONS = Object.entries(EXECUTIVE_APPROVAL_STATUS_LABELS) as [
  ExecutiveApprovalStatus,
  string,
][];

const PRIORITY_OPTIONS = Object.entries(EXECUTIVE_APPROVAL_PRIORITY_LABELS) as [
  ExecutiveApprovalPriority,
  string,
][];

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
  const requestedByValue = filters.requestedById ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const requesterOptions = lookups.requesters.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const typeOptions = EXECUTIVE_APPROVAL_TYPES.map((type) => ({
    value: type,
    label: EXECUTIVE_APPROVAL_TYPE_LABELS[type],
  }));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(event) => onChange({ search: event.target.value, page: 1 })}
            placeholder="Search request ID, title…"
            className="pl-9"
            disabled={disabled}
          />
        </div>

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
          <SelectTrigger>
            <SelectValue placeholder="Every approval type">
              {filterSelectLabel(typeValue, "Every approval type", typeOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every approval type</SelectItem>
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
          <SelectTrigger>
            <SelectValue placeholder="Every priority">
              {filterSelectLabelFromMap(
                priorityValue,
                "Every priority",
                EXECUTIVE_APPROVAL_PRIORITY_LABELS,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every priority</SelectItem>
            {PRIORITY_OPTIONS.map(([value, label]) => (
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
          <SelectTrigger>
            <SelectValue placeholder="Every status">
              {filterSelectLabelFromMap(
                statusValue,
                "Every status",
                EXECUTIVE_APPROVAL_STATUS_LABELS,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every status</SelectItem>
            {STATUS_OPTIONS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={requestedByValue}
          onValueChange={(value) =>
            onChange({
              requestedById: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every requester">
              {filterSelectLabel(requestedByValue, "Every requester", requesterOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every requester</SelectItem>
            {requesterOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(event) =>
            onChange({ dateFrom: event.target.value || undefined, page: 1 })
          }
          disabled={disabled}
          aria-label="Date from"
        />

        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(event) =>
            onChange({ dateTo: event.target.value || undefined, page: 1 })
          }
          disabled={disabled}
          aria-label="Date to"
        />
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onReset} disabled={disabled}>
          <RotateCcw className="size-3.5" />
          Reset Filters
        </Button>
      </div>
    </section>
  );
}
