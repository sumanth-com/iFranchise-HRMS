"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import type { SelectItemOption } from "@/components/payroll/select-utils";
import { cn } from "@/lib/utils";

type FilterSelectProps = {
  items: SelectItemOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
};

/** Select with `items` mapping so labels display instead of raw values. */
export function FilterSelect({
  items,
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
  triggerClassName,
  contentClassName,
  itemClassName,
}: FilterSelectProps) {
  return (
    <div className={cn("w-full", className)}>
      <Select
        items={items}
        value={value || null}
        onValueChange={(next) => {
          if (next) onValueChange(next);
        }}
        disabled={disabled}
      >
        <SelectTrigger className={cn("h-9 w-full", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="start" sideOffset={4} className={cn("min-w-[10rem] p-1", contentClassName)}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} className={cn("py-2", itemClassName)}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
