"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import type { LookupOption } from "@/types/employee";

import { toEmployeeSelectItems, type SelectItemOption } from "./select-utils";

type EmployeeSelectProps = {
  employees: LookupOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

export function EmployeeSelect({
  employees,
  value = "",
  onValueChange,
  placeholder = "Select employee",
  disabled,
  id,
}: EmployeeSelectProps) {
  const items = toEmployeeSelectItems(employees);

  return (
    <LabeledSelect
      items={items}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      id={id}
    />
  );
}

type LabeledSelectProps = {
  items: SelectItemOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

export function LabeledSelect({
  items,
  value = "",
  onValueChange,
  placeholder = "Select",
  disabled,
  id,
}: LabeledSelectProps) {
  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="h-8 w-full min-w-0">
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
