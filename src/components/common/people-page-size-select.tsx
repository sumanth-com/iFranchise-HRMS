"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";

export const PEOPLE_PAGE_SIZES = [10, 15, 20, 25, 30] as const;

export const PROVISIONING_PEOPLE_PAGE_SIZES = [10, 20, 50, 100] as const;

/** Page sizes in steps of 20, scaled to how many rows are available. */
export function buildSteppedPeoplePageSizes(totalRecords: number, step = 20): number[] {
  const available = Math.max(1, totalRecords);
  if (available <= step) return [step];

  const sizes: number[] = [];
  for (let size = step; size <= 100; size += step) {
    sizes.push(size);
    if (size >= available) return sizes;
  }

  const cover = Math.ceil(available / step) * step;
  for (let size = 200; size < cover; size += 100) {
    sizes.push(size);
  }
  if (!sizes.includes(cover)) sizes.push(cover);
  return sizes;
}

export function PeoplePageSizeSelect({
  value,
  disabled,
  onChange,
  className,
  totalRecords,
  valueLabel = "people",
}: {
  value: number;
  disabled?: boolean;
  onChange: (pageSize: number) => void;
  className?: string;
  /** When set, options are 20, 40, 60… based on this count. */
  totalRecords?: number;
  /** `number` shows only 20, 40… without the “people” suffix. */
  valueLabel?: "people" | "number";
}) {
  const sizes =
    typeof totalRecords === "number"
      ? buildSteppedPeoplePageSizes(totalRecords)
      : [...PEOPLE_PAGE_SIZES];

  const options = sizes.includes(value) ? sizes : [...sizes, value].sort((a, b) => a - b);
  const items = options.map((size) => ({
    value: String(size),
    label: valueLabel === "number" ? String(size) : `${size} people`,
  }));
  const selected = String(value);

  return (
    <Select
      items={items}
      value={selected}
      onValueChange={(next) => {
        if (!next) return;
        const size = Number(next);
        if (!options.includes(size)) return;
        if (size === value) return;
        onChange(size);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-10 shrink-0 bg-white font-semibold dark:bg-input",
          valueLabel === "number"
            ? "w-[4.25rem] gap-1 px-2.5 [&_[data-slot=select-value]]:flex-none [&_[data-slot=select-value]]:grow-0"
            : "w-[9rem]",
          className,
        )}
        aria-label={valueLabel === "number" ? "Rows per page" : "People per page"}
      >
        <SelectValue placeholder={valueLabel === "number" ? "20" : "People"} />
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProvisioningPeoplePageSizeSelect({
  value,
  totalRecords,
  disabled,
  onChange,
  className,
}: {
  value: number;
  totalRecords: number;
  disabled?: boolean;
  onChange: (pageSize: number) => void;
  className?: string;
}) {
  const showingAll = totalRecords > 0 && value >= totalRecords;
  const selected = showingAll ? "all" : String(value);
  const items = [
    ...PROVISIONING_PEOPLE_PAGE_SIZES.map((size) => ({
      value: String(size),
      label: `${size} people`,
    })),
    { value: "all", label: "All" },
  ];

  return (
    <Select
      items={items}
      value={selected}
      onValueChange={(next) => {
        if (!next) return;
        if (next === "all") {
          onChange(Math.max(totalRecords, 1));
          return;
        }
        const size = Number(next);
        if (!Number.isFinite(size) || size <= 0) return;
        onChange(size);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn("h-10 w-[9rem] shrink-0 bg-white font-semibold dark:bg-input", className)}
        aria-label="People per page"
      >
        <SelectValue placeholder="20 people" />
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
