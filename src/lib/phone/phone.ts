export type PhoneCountryOption = {
  code: string;
  label: string;
  maxDigits: number;
};

/** Supported dial codes with the national digit length we accept. */
export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { code: "+91", label: "India (+91)", maxDigits: 10 },
  { code: "+1", label: "United States / Canada (+1)", maxDigits: 10 },
  { code: "+44", label: "United Kingdom (+44)", maxDigits: 10 },
  { code: "+971", label: "UAE (+971)", maxDigits: 9 },
  { code: "+966", label: "Saudi Arabia (+966)", maxDigits: 9 },
  { code: "+974", label: "Qatar (+974)", maxDigits: 8 },
  { code: "+61", label: "Australia (+61)", maxDigits: 9 },
  { code: "+65", label: "Singapore (+65)", maxDigits: 8 },
  { code: "+49", label: "Germany (+49)", maxDigits: 11 },
  { code: "+33", label: "France (+33)", maxDigits: 9 },
];

export const DEFAULT_PHONE_COUNTRY_CODE = "+91";

export function phoneCountryMeta(code: string): PhoneCountryOption {
  return (
    PHONE_COUNTRY_OPTIONS.find((item) => item.code === code) ??
    PHONE_COUNTRY_OPTIONS[0]!
  );
}

/**
 * Parse a stored phone (`+91 9876543210` or raw digits) into country + national number.
 * Longer dial codes are matched first so +971 is not read as +9…
 */
export function parseStoredPhone(
  value: unknown,
  defaultCode = DEFAULT_PHONE_COUNTRY_CODE,
): { countryCode: string; nationalNumber: string } {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return { countryCode: defaultCode, nationalNumber: "" };

  const digits = raw.replace(/\D/g, "");
  if (!digits) return { countryCode: defaultCode, nationalNumber: "" };

  const sorted = [...PHONE_COUNTRY_OPTIONS].sort(
    (a, b) => b.code.replace(/\D/g, "").length - a.code.replace(/\D/g, "").length,
  );

  for (const option of sorted) {
    const codeDigits = option.code.replace(/\D/g, "");
    if (digits.startsWith(codeDigits) && digits.length > codeDigits.length) {
      return {
        countryCode: option.code,
        nationalNumber: digits.slice(
          codeDigits.length,
          codeDigits.length + option.maxDigits,
        ),
      };
    }
  }

  const defaultMax = phoneCountryMeta(defaultCode).maxDigits;
  if (digits.length <= defaultMax) {
    return {
      countryCode: defaultCode,
      nationalNumber: digits.slice(0, defaultMax),
    };
  }

  return {
    countryCode: defaultCode,
    nationalNumber: digits.slice(-defaultMax),
  };
}

export function formatStoredPhone(countryCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, "");
  if (!digits) return "";
  return `${countryCode} ${digits}`;
}

/** Exact national digit count for the detected/selected country. Empty is invalid. */
export function isValidStoredPhone(value: unknown): boolean {
  const parsed = parseStoredPhone(value);
  if (!parsed.nationalNumber) return false;
  const meta = phoneCountryMeta(parsed.countryCode);
  return parsed.nationalNumber.length === meta.maxDigits;
}

/** Empty allowed; if present, must match country digit length. */
export function isOptionalStoredPhone(value: unknown): boolean {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return true;
  return isValidStoredPhone(raw);
}

export function phoneDigitHint(countryCode: string): string {
  const meta = phoneCountryMeta(countryCode);
  return `${meta.maxDigits} digits for ${meta.label}`;
}
