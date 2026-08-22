"use client";

import { Input } from "@/components/common/input";
import { OnboardingAddressFields } from "@/components/onboarding/candidate/onboarding-address-fields";
import { OnboardingPhoneField } from "@/components/onboarding/candidate/onboarding-phone-field";
import { OnboardingWizardSelect } from "@/components/onboarding/candidate/onboarding-wizard-select";
import {
  buildPersonalSectionFieldValues,
} from "@/lib/onboarding/onboarding-personal-field-utils";
import {
  ONBOARDING_BLOOD_GROUP_OPTIONS,
  ONBOARDING_GENDER_OPTIONS,
  ONBOARDING_MARITAL_STATUS_OPTIONS,
  todayIsoDate,
} from "@/lib/onboarding/personal-field-options";
import type { SelectItemOption } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";

const GENDER_ITEMS: SelectItemOption[] = ONBOARDING_GENDER_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));
const MARITAL_ITEMS: SelectItemOption[] = ONBOARDING_MARITAL_STATUS_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));
const BLOOD_GROUP_ITEMS: SelectItemOption[] = ONBOARDING_BLOOD_GROUP_OPTIONS.map((item) => ({
  value: item.value,
  label: item.label,
}));

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-sm font-medium text-foreground">
      {label}
      {required ? <span className="text-foreground"> *</span> : null}
    </Label>
  );
}

type OnboardingPersonalSectionProps = {
  sectionData: unknown;
  form: Record<string, string>;
  fullNameFallback?: unknown;
  personalEmailFallback?: unknown;
  inputClassName: string;
  onFieldChange: (key: string, value: string) => void;
};

export function OnboardingPersonalSection({
  sectionData,
  form,
  fullNameFallback,
  personalEmailFallback,
  inputClassName,
  onFieldChange,
}: OnboardingPersonalSectionProps) {
  const fields = buildPersonalSectionFieldValues({
    sectionData,
    form,
    fullNameFallback,
    personalEmailFallback,
    genderOptions: ONBOARDING_GENDER_OPTIONS,
    maritalOptions: ONBOARDING_MARITAL_STATUS_OPTIONS,
    bloodGroupOptions: ONBOARDING_BLOOD_GROUP_OPTIONS,
  });

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div className="space-y-1">
        <FieldLabel label="Full name" required />
        <Input
          className={inputClassName}
          value={fields.fullName}
          onChange={(e) => onFieldChange("fullName", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <FieldLabel label="Date of birth" required />
        <Input
          type="date"
          className={inputClassName}
          max={todayIsoDate()}
          value={fields.dateOfBirth}
          onChange={(e) => onFieldChange("dateOfBirth", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <FieldLabel label="Gender" required />
        <OnboardingWizardSelect
          items={GENDER_ITEMS}
          value={fields.gender}
          placeholder="Select gender"
          onValueChange={(value) => onFieldChange("gender", value)}
          triggerClassName={inputClassName}
        />
      </div>
      <div className="space-y-1">
        <FieldLabel label="Marital status" />
        <OnboardingWizardSelect
          items={MARITAL_ITEMS}
          value={fields.maritalStatus}
          placeholder="Select marital status"
          onValueChange={(value) => onFieldChange("maritalStatus", value)}
          triggerClassName={inputClassName}
        />
      </div>
      <div className="space-y-1">
        <FieldLabel label="Blood group" />
        <OnboardingWizardSelect
          items={BLOOD_GROUP_ITEMS}
          value={fields.bloodGroup}
          placeholder="Select blood group"
          onValueChange={(value) => onFieldChange("bloodGroup", value)}
          triggerClassName={inputClassName}
        />
      </div>
      <div className="space-y-1">
        <FieldLabel label="Nationality" />
        <Input
          className={inputClassName}
          value={fields.nationality}
          onChange={(e) => onFieldChange("nationality", e.target.value)}
          placeholder="Nationality"
        />
      </div>
      <OnboardingAddressFields
        stateValue={fields.state}
        cityValue={fields.city}
        pincodeValue={fields.pincode}
        addressLineValue={fields.addressLine}
        onStateChange={(value) => onFieldChange("state", value)}
        onCityChange={(value) => onFieldChange("city", value)}
        onPincodeChange={(value) => onFieldChange("pincode", value)}
        onAddressLineChange={(value) => onFieldChange("addressLine", value)}
        inputClassName={inputClassName}
      />
      <OnboardingPhoneField
        label="Personal mobile"
        required
        className="w-full max-w-none"
        value={fields.personalMobile}
        onChange={(value) => onFieldChange("personalMobile", value)}
        placeholder="Mobile number"
      />
      <OnboardingPhoneField
        label="Emergency contact"
        required
        className="w-full max-w-none"
        value={fields.emergencyContact}
        onChange={(value) => onFieldChange("emergencyContact", value)}
        placeholder="Emergency number"
      />
      <div className="space-y-1 sm:col-span-2">
        <FieldLabel label="Personal email" required />
        <Input
          type="email"
          className={inputClassName}
          value={fields.personalEmail}
          onChange={(e) => onFieldChange("personalEmail", e.target.value)}
        />
      </div>
    </div>
  );
}
