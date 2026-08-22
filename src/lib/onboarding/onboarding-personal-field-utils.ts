import {
  normalizeSelectValue,
  toDateInputValue,
} from "@/lib/onboarding/personal-field-options";

/** Ensure section JSON from Supabase is a plain object for form initialization. */
export function normalizeOnboardingSectionData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return data as Record<string, unknown>;
}

/** Coerce onboarding section JSON values to plain strings for controlled inputs. */
export function readOnboardingTextField(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function readNestedAddressField(address: unknown, keys: string[]): string {
  if (!address || typeof address !== "object" || Array.isArray(address)) return "";
  const record = address as Record<string, unknown>;
  for (const key of keys) {
    const text = readOnboardingTextField(record[key]);
    if (text.trim()) return text;
  }
  return "";
}

/** Read address line from flat or legacy nested `address` objects in section JSON. */
export function readOnboardingAddressLine(sectionData: Record<string, unknown>): string {
  const flat = readOnboardingTextField(sectionData.addressLine);
  if (flat.trim()) return flat;

  const legacyString = readOnboardingTextField(sectionData.address);
  if (legacyString.trim()) return legacyString;

  return readNestedAddressField(sectionData.address, [
    "line1",
    "addressLine",
    "street",
    "line",
  ]);
}

export type PersonalSectionFieldValues = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  state: string;
  city: string;
  pincode: string;
  addressLine: string;
  personalMobile: string;
  emergencyContact: string;
  personalEmail: string;
};

type PersonalFieldOptions = readonly { value: string; label: string }[];

export function buildPersonalSectionFieldValues(input: {
  sectionData: unknown;
  form: Record<string, string> | null | undefined;
  fullNameFallback?: unknown;
  personalEmailFallback?: unknown;
  genderOptions: PersonalFieldOptions;
  maritalOptions: PersonalFieldOptions;
  bloodGroupOptions: PersonalFieldOptions;
}): PersonalSectionFieldValues {
  const sectionData = normalizeOnboardingSectionData(input.sectionData);
  const form = input.form ?? {};
  const fullNameFallback = readOnboardingTextField(input.fullNameFallback).trim();
  const personalEmailFallback = readOnboardingTextField(input.personalEmailFallback).trim();

  function textField(key: string, fallback = ""): string {
    if (key in form) return readOnboardingTextField(form[key]);
    const saved = readOnboardingTextField(sectionData[key]);
    return saved.trim() ? saved : fallback;
  }

  function selectField(
    key: string,
    options: PersonalFieldOptions,
  ): string {
    if (form[key]) {
      return normalizeSelectValue(form[key], options);
    }
    return normalizeSelectValue(sectionData[key], options);
  }

  const fullName = textField("fullName", fullNameFallback);
  const personalEmail = textField("personalEmail", personalEmailFallback);

  return {
    fullName,
    dateOfBirth:
      "dateOfBirth" in form
        ? toDateInputValue(form.dateOfBirth)
        : toDateInputValue(sectionData.dateOfBirth),
    gender: selectField("gender", input.genderOptions),
    maritalStatus: selectField("maritalStatus", input.maritalOptions),
    bloodGroup: selectField("bloodGroup", input.bloodGroupOptions),
    nationality: textField("nationality"),
    state: textField("state", readNestedAddressField(sectionData.address, ["state"])),
    city: textField("city", readNestedAddressField(sectionData.address, ["city", "district"])),
    pincode: textField("pincode", readNestedAddressField(sectionData.address, ["pincode", "zip"])),
    addressLine: "addressLine" in form ? readOnboardingTextField(form.addressLine) : readOnboardingAddressLine(sectionData),
    personalMobile: textField("personalMobile"),
    emergencyContact: textField("emergencyContact"),
    personalEmail,
  };
}
