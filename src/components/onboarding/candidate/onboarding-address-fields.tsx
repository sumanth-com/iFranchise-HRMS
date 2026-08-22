"use client";

import { useMemo } from "react";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingTypeaheadField } from "@/components/onboarding/candidate/onboarding-typeahead-field";
import {
  filterIndianCities,
  filterIndianStates,
} from "@/lib/onboarding/india-locations";

type OnboardingAddressFieldsProps = {
  stateValue: string;
  cityValue: string;
  pincodeValue: string;
  addressLineValue: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onPincodeChange: (value: string) => void;
  onAddressLineChange: (value: string) => void;
  inputClassName: string;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-sm font-medium text-foreground">
      {label}
      {required ? <span className="text-foreground"> *</span> : null}
    </Label>
  );
}

export function OnboardingAddressFields({
  stateValue,
  cityValue,
  pincodeValue,
  addressLineValue,
  onStateChange,
  onCityChange,
  onPincodeChange,
  onAddressLineChange,
  inputClassName,
}: OnboardingAddressFieldsProps) {
  const stateSuggestions = useMemo(
    () => filterIndianStates(stateValue),
    [stateValue],
  );
  const citySuggestions = useMemo(
    () => filterIndianCities(stateValue, cityValue),
    [stateValue, cityValue],
  );

  return (
    <div className="space-y-2.5 sm:col-span-2">
      <div className="grid gap-2.5 sm:grid-cols-3">
        <OnboardingTypeaheadField
          label="State"
          required
          value={stateValue}
          placeholder="Type to search state"
          suggestions={stateSuggestions}
          onValueChange={onStateChange}
          onSelect={() => onCityChange("")}
          inputClassName={inputClassName}
        />
        <OnboardingTypeaheadField
          label="City / district"
          required
          value={cityValue}
          placeholder={stateValue ? "Type to search city" : "Select state first"}
          disabled={!stateValue.trim()}
          suggestions={citySuggestions}
          onValueChange={onCityChange}
          inputClassName={inputClassName}
        />
        <div className="space-y-1">
          <FieldLabel label="Pincode" required />
          <Input
            value={pincodeValue}
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit pincode"
            className={inputClassName}
            onChange={(e) => onPincodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <FieldLabel label="Address line" />
        <Input
          value={addressLineValue}
          placeholder="House no., street, area (optional)"
          className={inputClassName}
          onChange={(e) => onAddressLineChange(e.target.value)}
        />
      </div>
    </div>
  );
}
