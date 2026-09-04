"use client";

import { Button } from "@/components/common/button";
import type { EmploymentCategoryFilter } from "@/lib/employees/employment-category";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: Array<{ value: EmploymentCategoryFilter; label: string }> = [
  { value: "all", label: "All Employees" },
  { value: "probation", label: "Probation" },
  { value: "full_time", label: "Full Time" },
];

export function EmploymentCategoryFilters({
  value,
  onChange,
  disabled = false,
}: {
  value: EmploymentCategoryFilter;
  onChange: (value: EmploymentCategoryFilter) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={disabled}
            className={cn(
              "h-9 rounded-full px-4 text-xs font-semibold",
              active && "pointer-events-none shadow-sm",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
