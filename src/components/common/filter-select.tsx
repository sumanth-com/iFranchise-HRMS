"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import type { SelectItemOption } from "@/components/payroll/select-utils";

type FilterSelectProps = {
  items: SelectItemOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

/** Select with `items` mapping so labels display instead of raw values. */
export function FilterSelect({
  items,
  value,
  onValueChange,
  placeholder,
  disabled,
}: FilterSelectProps) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
