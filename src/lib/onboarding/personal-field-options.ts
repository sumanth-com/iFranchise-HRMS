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

export type PhoneCountryOption = {
  code: string;
  label: string;
  maxDigits: number;
};

export const ONBOARDING_PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { code: "+91", label: "India (+91)", maxDigits: 10 },
  { code: "+1", label: "United States (+1)", maxDigits: 10 },
  { code: "+44", label: "United Kingdom (+44)", maxDigits: 10 },
  { code: "+971", label: "UAE (+971)", maxDigits: 9 },
  { code: "+61", label: "Australia (+61)", maxDigits: 9 },
  { code: "+65", label: "Singapore (+65)", maxDigits: 8 },
];

export function phoneCountryMeta(code: string): PhoneCountryOption {
  return (
    ONBOARDING_PHONE_COUNTRY_OPTIONS.find((item) => item.code === code) ??
    ONBOARDING_PHONE_COUNTRY_OPTIONS[0]
  );
}

export function parseStoredPhone(
  value: unknown,
  defaultCode = "+91",
): { countryCode: string; nationalNumber: string } {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { countryCode: defaultCode, nationalNumber: "" };

  const digits = raw.replace(/\D/g, "");
  if (!digits) return { countryCode: defaultCode, nationalNumber: "" };

  for (const option of ONBOARDING_PHONE_COUNTRY_OPTIONS) {
    const codeDigits = option.code.replace(/\D/g, "");
    if (digits.startsWith(codeDigits) && digits.length > codeDigits.length) {
      return {
        countryCode: option.code,
        nationalNumber: digits.slice(codeDigits.length, codeDigits.length + option.maxDigits),
      };
    }
  }

  if (digits.length <= 10) {
    return {
      countryCode: defaultCode,
      nationalNumber: digits.slice(0, phoneCountryMeta(defaultCode).maxDigits),
    };
  }

  return {
    countryCode: defaultCode,
    nationalNumber: digits.slice(-phoneCountryMeta(defaultCode).maxDigits),
  };
}

export function formatStoredPhone(countryCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, "");
  if (!digits) return "";
  return `${countryCode} ${digits}`;
}

export function normalizeSelectValue(
  value: unknown,
  options: readonly { value: string }[],
): string {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return "";
  const match = options.find(
    (option) =>
      option.value === raw ||
      option.value.replace(/_/g, " ") === raw ||
      option.value === raw.replace(/\s+/g, "_"),
  );
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

export function isValidStoredPhone(value: unknown): boolean {
  const parsed = parseStoredPhone(value);
  if (!parsed.nationalNumber) return false;
  const meta = phoneCountryMeta(parsed.countryCode);
  return parsed.nationalNumber.length === meta.maxDigits;
}
