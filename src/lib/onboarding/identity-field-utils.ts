export const AADHAAR_DIGITS = 12;
export const PAN_LENGTH = 10;

/** Aadhaar: exactly 12 digits. */
export function sanitizeAadhaar(value: string): string {
  return value.replace(/\D/g, "").slice(0, AADHAAR_DIGITS);
}

/** PAN: ABCDE1234F — 5 letters, 4 digits, 1 letter. */
export function sanitizePan(value: string): string {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let result = "";

  for (const char of upper) {
    const index = result.length;
    if (index < 5) {
      if (/[A-Z]/.test(char)) result += char;
    } else if (index < 9) {
      if (/\d/.test(char)) result += char;
    } else if (index === 9) {
      if (/[A-Z]/.test(char)) result += char;
    }
    if (result.length >= PAN_LENGTH) break;
  }

  return result;
}

export function isValidAadhaar(value: unknown): boolean {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  return digits.length === AADHAAR_DIGITS;
}

export function isValidPan(value: unknown): boolean {
  const pan = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(pan);
}
