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
};

/** Onboarding wrapper around the shared PhoneInput. */
export function OnboardingPhoneField(props: OnboardingPhoneFieldProps) {
  return <PhoneInput {...props} />;
}
