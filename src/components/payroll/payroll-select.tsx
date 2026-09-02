"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/types/employee";

import { toEmployeeSelectItems, type SelectItemOption } from "./select-utils";

export const FORM_SELECT_TRIGGER = "h-10 w-full min-w-0 bg-white dark:bg-input";
export const FORM_SELECT_CONTENT =
  "min-w-[var(--anchor-width)] w-[var(--anchor-width)] max-h-60";

type EmployeeSelectProps = {
  employees: LookupOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  triggerClassName?: string;
  contentClassName?: string;
};

export function EmployeeSelect({
  employees,
  value = "",
  onValueChange,
  placeholder = "Select employee",
  disabled,
  id,
  triggerClassName,
  contentClassName,
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
      triggerClassName={triggerClassName}
      contentClassName={contentClassName}
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
  triggerClassName?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  alignItemWithTrigger?: boolean;
};

export function LabeledSelect({
  items,
  value = "",
  onValueChange,
  placeholder = "Select",
  disabled,
  id,
  triggerClassName,
  contentClassName,
  align = "start",
  side = "bottom",
  alignItemWithTrigger = false,
}: LabeledSelectProps) {
  const safeValue = items.some((item) => item.value === value) ? value : null;

  return (
    <Select
      items={items}
      value={safeValue}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={triggerClassName ?? "h-8 w-full min-w-0"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        side={side}
        align={align}
        sideOffset={6}
        alignItemWithTrigger={alignItemWithTrigger}
        className={cn(FORM_SELECT_CONTENT, contentClassName)}
      >
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="py-2">
            <span className="block whitespace-normal leading-snug">{item.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
