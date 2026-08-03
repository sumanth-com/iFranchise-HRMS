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

type OnboardingPhoneFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  showHint?: boolean;
};

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
    <div className="space-y-1">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-foreground"> *</span> : null}
      </Label>
      <div className="flex gap-2">
        <LabeledSelect
          items={countryItems}
          value={countryCode}
          onValueChange={updateCountry}
          triggerClassName="h-9 w-[5.5rem] shrink-0 text-sm"
          contentClassName="min-w-[8rem]"
          disabled={disabled}
        />
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={maxDigits}
          value={parsed.nationalNumber}
          onChange={(e) => updateNumber(e.target.value)}
          placeholder={placeholder}
          className="h-9 min-w-0 flex-1 text-sm"
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
