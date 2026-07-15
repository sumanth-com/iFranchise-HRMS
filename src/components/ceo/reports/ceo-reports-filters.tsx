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
  CEO_REPORT_CATEGORIES,
  CEO_REPORT_CATEGORY_LABELS,
} from "@/lib/ceo/ceo-report-definitions";
import {
  FILTER_ANY_VALUE,
  filterSelectLabel,
  filterSelectLabelFromMap,
  MANAGER_FILTER_SELECT_CONTENT_CLASS,
} from "@/lib/manager/filter-select";
import type {
  CeoReportCategory,
  CeoReportFormat,
  CeoReportsFilterLookups,
  CeoReportsListParams,
} from "@/types/ceo-reports";

type CeoReportsFiltersProps = {
  filters: CeoReportsListParams;
  lookups: CeoReportsFilterLookups;
  onChange: (next: Partial<CeoReportsListParams>) => void;
  onReset: () => void;
  disabled?: boolean;
};

const FORMAT_LABELS: Record<string, string> = {
  csv: "CSV",
  excel: "Excel",
  pdf: "PDF",
  summary_pdf: "Executive Summary PDF",
  board_summary: "Board Presentation Summary",
};

export function CeoReportsFilters({
  filters,
  lookups,
  onChange,
  onReset,
  disabled,
}: CeoReportsFiltersProps) {
  const categoryValue = filters.category ?? FILTER_ANY_VALUE;
  const departmentValue = filters.departmentId ?? FILTER_ANY_VALUE;
  const branchValue = filters.branchId ?? FILTER_ANY_VALUE;
  const formatValue = filters.format ?? FILTER_ANY_VALUE;
  const createdByValue = filters.createdById ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const branchOptions = lookups.branches.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const creatorOptions = lookups.creators.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const categoryOptions = CEO_REPORT_CATEGORIES.map((category) => ({
    value: category,
    label: CEO_REPORT_CATEGORY_LABELS[category],
  }));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search ?? ""}
            onChange={(event) => onChange({ search: event.target.value, page: 1 })}
            placeholder="Search reports…"
            className="pl-9"
            disabled={disabled}
          />
        </div>

        <Select
          value={categoryValue}
          onValueChange={(value) =>
            onChange({
              category:
                !value || value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as CeoReportCategory),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every category">
              {filterSelectLabel(categoryValue, "Every category", categoryOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every category</SelectItem>
            {categoryOptions.map((item) => (
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
          value={branchValue}
          onValueChange={(value) =>
            onChange({
              branchId: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every branch">
              {filterSelectLabel(branchValue, "Every branch", branchOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every branch</SelectItem>
            {branchOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={formatValue}
          onValueChange={(value) =>
            onChange({
              format:
                !value || value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as CeoReportFormat),
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every format">
              {filterSelectLabelFromMap(formatValue, "Every format", FORMAT_LABELS)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every format</SelectItem>
            {Object.entries(FORMAT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={createdByValue}
          onValueChange={(value) =>
            onChange({
              createdById: !value || value === FILTER_ANY_VALUE ? undefined : value,
              page: 1,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Every creator">
              {filterSelectLabel(createdByValue, "Every creator", creatorOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>Every creator</SelectItem>
            {creatorOptions.map((item) => (
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
