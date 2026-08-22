"use client";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_WIZARD_NATIVE_SELECT_CLASS } from "@/components/onboarding/candidate/onboarding-wizard-select";
import {
  formatStoredPhone,
  parseStoredPhone,
  phoneCountryMeta,
  phoneDigitHint,
  PHONE_COUNTRY_OPTIONS,
} from "@/lib/phone/phone";
import { cn } from "@/lib/utils";

type OnboardingPhoneFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  showHint?: boolean;
  className?: string;
};

/** Onboarding phone field with a native country-code select (no portal popovers). */
export function OnboardingPhoneField({
  label,
  value,
  onChange,
  required,
  placeholder = "Phone number",
  disabled,
  showHint = true,
  className,
}: OnboardingPhoneFieldProps) {
  const safeValue = typeof value === "string" ? value : "";
  const parsed = parseStoredPhone(safeValue);
  const countryCode = parsed.countryCode;
  const maxDigits = phoneCountryMeta(countryCode).maxDigits;

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
    <div className={cn("w-full max-w-none space-y-1.5", className)}>
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-foreground"> *</span> : null}
      </Label>
      <div
        className={cn(
          "flex w-full items-stretch rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
          "h-9",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="w-[4.75rem] shrink-0 border-r border-input">
          <select
            className={cn(
              ONBOARDING_WIZARD_NATIVE_SELECT_CLASS,
              "h-9 rounded-none rounded-l-lg border-0 bg-transparent px-2 pr-6 shadow-none focus-visible:ring-0",
            )}
            value={countryCode}
            disabled={disabled}
            onChange={(event) => updateCountry(event.target.value)}
            aria-label={`${label} country code`}
          >
            {PHONE_COUNTRY_OPTIONS.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code}
              </option>
            ))}
          </select>
        </div>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={maxDigits}
          value={parsed.nationalNumber}
          onChange={(event) => updateNumber(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 border-0 bg-transparent shadow-none rounded-none rounded-r-lg px-2.5 focus-visible:border-transparent focus-visible:ring-0 h-9"
        />
      </div>
      {showHint ? (
        <p className="text-[11px] leading-tight text-muted-foreground text-left">
          {phoneDigitHint(countryCode)}
        </p>
      ) : null}
    </div>
  );
}
