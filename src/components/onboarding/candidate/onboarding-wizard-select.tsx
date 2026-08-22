"use client";

import { LabeledSelect } from "@/components/payroll/payroll-select";
import type { SelectItemOption } from "@/components/payroll/select-utils";
import { cn } from "@/lib/utils";

const wizardSelectContentClassName =
  "max-h-60 min-w-[var(--anchor-width)] w-[var(--anchor-width)]";

type OnboardingWizardSelectProps = {
  items: SelectItemOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
};

/** Select for the onboarding wizard scroll pane — avoids portal/scroll clipping issues. */
export function OnboardingWizardSelect({
  items,
  value = "",
  onValueChange,
  placeholder = "Select",
  disabled,
  triggerClassName,
}: OnboardingWizardSelectProps) {
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
      contentClassName={wizardSelectContentClassName}
    />
  );
}
