"use client";

import { LabeledSelect } from "@/components/payroll/payroll-select";
import type { SelectItemOption } from "@/components/payroll/select-utils";
import { cn } from "@/lib/utils";

const educationSelectContentClassName =
  "max-h-60 min-w-[var(--anchor-width)] w-[var(--anchor-width)]";

type OnboardingEducationSelectProps = {
  items: SelectItemOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
};

/** Select tuned for the onboarding education wizard (aligned dropdown, no scroll jump). */
export function OnboardingEducationSelect({
  items,
  value = "",
  onValueChange,
  placeholder = "Select",
  disabled,
  triggerClassName,
}: OnboardingEducationSelectProps) {
  return (
    <LabeledSelect
      items={items}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      align="start"
      side="bottom"
      alignItemWithTrigger={false}
      triggerClassName={cn("w-full min-w-0", triggerClassName)}
      contentClassName={educationSelectContentClassName}
    />
  );
}
