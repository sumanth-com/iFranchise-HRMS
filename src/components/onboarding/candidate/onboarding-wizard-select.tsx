"use client";

import type { SelectItemOption } from "@/components/payroll/select-utils";
import { cn } from "@/lib/utils";

/** Shared styling for native wizard selects — matches onboarding text inputs. */
export const ONBOARDING_WIZARD_NATIVE_SELECT_CLASS =
  "h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-background px-2.5 pr-8 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background dark:text-foreground";

type OnboardingWizardSelectProps = {
  items: SelectItemOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
};

/** Native select for the onboarding wizard scroll pane — no portals, no mount races. */
export function OnboardingWizardSelect({
  items,
  value = "",
  onValueChange,
  placeholder = "Select",
  disabled,
  triggerClassName,
}: OnboardingWizardSelectProps) {
  const safeValue = items.some((item) => item.value === value) ? value : "";

  return (
    <select
      className={cn(ONBOARDING_WIZARD_NATIVE_SELECT_CLASS, triggerClassName)}
      value={safeValue}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="" disabled hidden>
        {placeholder}
      </option>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
