"use client";

import { PhoneInput } from "@/components/common/phone-input";

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

/** Onboarding wrapper around the shared PhoneInput. */
export function OnboardingPhoneField({ className, ...props }: OnboardingPhoneFieldProps) {
  return <PhoneInput {...props} className={className} />;
}
