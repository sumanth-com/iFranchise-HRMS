"use client";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  formatStoredPhone,
  ONBOARDING_PHONE_COUNTRY_OPTIONS,
  parseStoredPhone,
  phoneCountryMeta,
} from "@/lib/onboarding/personal-field-options";
import { cn } from "@/lib/utils";

type OnboardingPhoneFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  showHint?: boolean;
};

const phoneSelectTriggerClass =
  "h-9 w-full min-w-0 border-0 bg-transparent shadow-none rounded-none rounded-l-lg px-2.5 focus-visible:border-transparent focus-visible:ring-0 data-[size=default]:h-9";

const phoneInputClass =
  "h-9 min-w-0 flex-1 border-0 bg-transparent shadow-none rounded-none rounded-r-lg px-2.5 focus-visible:border-transparent focus-visible:ring-0";

export function OnboardingPhoneField({
  label,
  value,
  onChange,
  required,
  placeholder = "Phone number",
  disabled,
  showHint = true,
}: OnboardingPhoneFieldProps) {
  const parsed = parseStoredPhone(value);
  const countryCode = parsed.countryCode;
  const maxDigits = phoneCountryMeta(countryCode).maxDigits;

  const countryItems = ONBOARDING_PHONE_COUNTRY_OPTIONS.map((item) => ({
    value: item.code,
    label: item.code,
  }));

  function updateCountry(nextCode: string) {
    const nextMax = phoneCountryMeta(nextCode).maxDigits;
    const trimmed = parsed.nationalNumber.slice(0, nextMax);
    onChange(formatStoredPhone(nextCode, trimmed));
  }

  function updateNumber(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, maxDigits);
    onChange(formatStoredPhone(countryCode, digits));
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div
        className={cn(
          "flex h-9 items-stretch rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="w-[5.75rem] shrink-0 border-r border-input">
          <LabeledSelect
            items={countryItems}
            value={countryCode}
            onValueChange={updateCountry}
            triggerClassName={phoneSelectTriggerClass}
            contentClassName="min-w-[8rem]"
            disabled={disabled}
          />
        </div>
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={maxDigits}
          value={parsed.nationalNumber}
          onChange={(e) => updateNumber(e.target.value)}
          placeholder={placeholder}
          className={phoneInputClass}
          disabled={disabled}
        />
      </div>
      {showHint ? (
        <p className="text-[11px] text-muted-foreground">
          {maxDigits} digits for {phoneCountryMeta(countryCode).label}
        </p>
      ) : null}
    </div>
  );
}
