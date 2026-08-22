export const ONBOARDING_GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const ONBOARDING_MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "other", label: "Other" },
] as const;

export const ONBOARDING_BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
] as const;

export type { PhoneCountryOption } from "@/lib/phone/phone";
export {
  DEFAULT_PHONE_COUNTRY_CODE,
  formatStoredPhone,
  isValidStoredPhone,
  parseStoredPhone,
  phoneCountryMeta,
  PHONE_COUNTRY_OPTIONS as ONBOARDING_PHONE_COUNTRY_OPTIONS,
} from "@/lib/phone/phone";

export function normalizeSelectValue(
  value: unknown,
  options: readonly { value: string }[],
): string {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return "";
  const match = options.find((option) => {
    const normalized = option.value.toLowerCase();
    return (
      normalized === raw ||
      normalized.replace(/_/g, " ") === raw ||
      normalized === raw.replace(/\s+/g, "_")
    );
  });
  return match?.value ?? "";
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toIsoDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }

  return trimmed;
}

/** Safe value for `<input type="date" />` — empty when not a valid ISO date. */
export function toDateInputValue(value: unknown): string {
  const iso = toIsoDate(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
}
