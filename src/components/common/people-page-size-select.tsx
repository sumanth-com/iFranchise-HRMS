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

export function PeoplePageSizeSelect({
  value,
  disabled,
  onChange,
  className,
}: {
  value: number;
  disabled?: boolean;
  onChange: (pageSize: number) => void;
  className?: string;
}) {
  const items = PEOPLE_PAGE_SIZES.map((size) => ({
    value: String(size),
    label: `${size} people`,
  }));
  const selected = PEOPLE_PAGE_SIZES.includes(value as (typeof PEOPLE_PAGE_SIZES)[number])
    ? String(value)
    : String(PEOPLE_PAGE_SIZES[0]);

  return (
    <Select
      items={items}
      value={selected}
      onValueChange={(next) => {
        if (!next) return;
        const size = Number(next);
        if (!PEOPLE_PAGE_SIZES.includes(size as (typeof PEOPLE_PAGE_SIZES)[number])) return;
        if (size === value) return;
        onChange(size);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-10 w-[9rem] shrink-0 bg-white font-semibold dark:bg-input",
          className,
        )}
      >
        <SelectValue placeholder="People" />
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
