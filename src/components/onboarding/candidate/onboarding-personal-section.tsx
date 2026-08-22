"use client";

import { Input } from "@/components/common/input";
import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { OnboardingAddressFields } from "@/components/onboarding/candidate/onboarding-address-fields";
import { OnboardingPhoneField } from "@/components/onboarding/candidate/onboarding-phone-field";
import { OnboardingWizardSelect } from "@/components/onboarding/candidate/onboarding-wizard-select";
import { useClientMounted } from "@/hooks/use-client-mounted";
import { buildPersonalSectionFieldValues } from "@/lib/onboarding/onboarding-personal-field-utils";
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

function selectPlaceholder(
  value: string,
  items: SelectItemOption[],
  fallback: string,
): string {
  if (!value) return fallback;
  return items.find((item) => item.value === value)?.label ?? fallback;
}

type OnboardingPersonalSectionProps = {
  sectionData: Record<string, unknown>;
  form: Record<string, string>;
  fullNameFallback: string;
  personalEmailFallback: string;
  inputClassName: string;
  onFieldChange: (key: string, value: string) => void;
};

function OnboardingPersonalSectionContent({
  sectionData,
  form,
  fullNameFallback,
  personalEmailFallback,
  inputClassName,
  onFieldChange,
}: OnboardingPersonalSectionProps) {
  const mounted = useClientMounted();
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
        {mounted ? (
          <OnboardingWizardSelect
            items={GENDER_ITEMS}
            value={fields.gender}
            placeholder="Select gender"
            onValueChange={(value) => onFieldChange("gender", value)}
            triggerClassName={inputClassName}
          />
        ) : (
          <Input
            readOnly
            tabIndex={-1}
            className={inputClassName}
            value={selectPlaceholder(fields.gender, GENDER_ITEMS, "Select gender")}
            aria-hidden
          />
        )}
      </div>
      <div className="space-y-1">
        <FieldLabel label="Marital status" />
        {mounted ? (
          <OnboardingWizardSelect
            items={MARITAL_ITEMS}
            value={fields.maritalStatus}
            placeholder="Select marital status"
            onValueChange={(value) => onFieldChange("maritalStatus", value)}
            triggerClassName={inputClassName}
          />
        ) : (
          <Input
            readOnly
            tabIndex={-1}
            className={inputClassName}
            value={selectPlaceholder(fields.maritalStatus, MARITAL_ITEMS, "Select marital status")}
            aria-hidden
          />
        )}
      </div>
      <div className="space-y-1">
        <FieldLabel label="Blood group" />
        {mounted ? (
          <OnboardingWizardSelect
            items={BLOOD_GROUP_ITEMS}
            value={fields.bloodGroup}
            placeholder="Select blood group"
            onValueChange={(value) => onFieldChange("bloodGroup", value)}
            triggerClassName={inputClassName}
          />
        ) : (
          <Input
            readOnly
            tabIndex={-1}
            className={inputClassName}
            value={selectPlaceholder(fields.bloodGroup, BLOOD_GROUP_ITEMS, "Select blood group")}
            aria-hidden
          />
        )}
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
      {mounted ? (
        <>
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
        </>
      ) : (
        <>
          <div className="space-y-1">
            <FieldLabel label="Personal mobile" required />
            <Input
              readOnly
              tabIndex={-1}
              className={inputClassName}
              value={fields.personalMobile}
              aria-hidden
            />
          </div>
          <div className="space-y-1">
            <FieldLabel label="Emergency contact" required />
            <Input
              readOnly
              tabIndex={-1}
              className={inputClassName}
              value={fields.emergencyContact}
              aria-hidden
            />
          </div>
        </>
      )}
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

export function OnboardingPersonalSection(props: OnboardingPersonalSectionProps) {
  return (
    <ClientSectionBoundary
      title="Couldn't load Personal Details"
      description="Something went wrong while opening this section. Your other onboarding steps are still available — try again or refresh the page."
    >
      <OnboardingPersonalSectionContent {...props} />
    </ClientSectionBoundary>
  );
}
