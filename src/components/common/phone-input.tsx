"use client";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  formatStoredPhone,
  parseStoredPhone,
  phoneCountryMeta,
  phoneDigitHint,
  PHONE_COUNTRY_OPTIONS,
} from "@/lib/phone/phone";
import { cn } from "@/lib/utils";

type PhoneInputProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  showHint?: boolean;
  error?: string;
  className?: string;
  /** Compact control for dense profile rows */
  size?: "default" | "sm";
};

export function PhoneInput({
  id,
  label,
  value,
  onChange,
  required,
  placeholder = "Phone number",
  disabled,
  showHint = true,
  error,
  className,
  size = "default",
}: PhoneInputProps) {
  const parsed = parseStoredPhone(value);
  const countryCode = parsed.countryCode;
  const maxDigits = phoneCountryMeta(countryCode).maxDigits;
  const heightClass = size === "sm" ? "h-8" : "h-9";

  const countryItems = PHONE_COUNTRY_OPTIONS.map((item) => ({
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
    <div className={cn(size === "sm" ? "w-[14.75rem]" : "w-full max-w-md", "space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={id} className="text-sm">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      <div
        className={cn(
          "flex w-full items-stretch rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
          heightClass,
          disabled && "pointer-events-none opacity-50",
          error && "border-destructive",
        )}
      >
        <div className="w-[4.75rem] shrink-0 border-r border-input">
          <LabeledSelect
            id={id ? `${id}-country` : undefined}
            items={countryItems}
            value={countryCode}
            onValueChange={updateCountry}
            triggerClassName={cn(
              "w-full min-w-0 border-0 bg-transparent shadow-none rounded-none rounded-l-lg px-2 focus-visible:border-transparent focus-visible:ring-0",
              heightClass,
              size === "sm" ? "text-xs" : "",
            )}
            contentClassName="min-w-[12rem]"
            disabled={disabled}
          />
        </div>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={maxDigits}
          value={parsed.nationalNumber}
          onChange={(event) => updateNumber(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent shadow-none rounded-none rounded-r-lg px-2.5 focus-visible:border-transparent focus-visible:ring-0",
            heightClass,
          )}
        />
      </div>
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : showHint ? (
        <p className="text-[11px] leading-tight text-muted-foreground">
          {phoneDigitHint(countryCode)}
        </p>
      ) : null}
    </div>
  );
}
