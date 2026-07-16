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

const CATEGORY_LABEL = "All Categories";
const DEPARTMENT_LABEL = "All Departments";
const FORMAT_LABEL = "Any Format";

const FORMAT_LABELS: Record<string, string> = {
  csv: "CSV",
  excel: "Excel",
  pdf: "PDF",
  summary_pdf: "Summary PDF",
  board_summary: "Board Summary",
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
  const formatValue = filters.format ?? FILTER_ANY_VALUE;

  const departmentOptions = lookups.departments.map((item) => ({
    value: item.id,
    label: item.label,
  }));
  const categoryOptions = CEO_REPORT_CATEGORIES.map((category) => ({
    value: category,
    label: CEO_REPORT_CATEGORY_LABELS[category],
  }));

  return (
    <section className="w-full rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3">
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[11rem]">
            <SelectValue placeholder={CATEGORY_LABEL}>
              {filterSelectLabel(categoryValue, CATEGORY_LABEL, categoryOptions)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{CATEGORY_LABEL}</SelectItem>
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
          <SelectTrigger className="h-10 min-w-0 flex-1 basis-[9rem]">
            <SelectValue placeholder={FORMAT_LABEL}>
              {filterSelectLabelFromMap(formatValue, FORMAT_LABEL, FORMAT_LABELS)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className={MANAGER_FILTER_SELECT_CONTENT_CLASS}
          >
            <SelectItem value={FILTER_ANY_VALUE}>{FORMAT_LABEL}</SelectItem>
            {Object.entries(FORMAT_LABELS).map(([value, label]) => (
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
