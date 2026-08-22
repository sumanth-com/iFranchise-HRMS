export const BANK_ACCOUNT_MIN_DIGITS = 9;
export const BANK_ACCOUNT_MAX_DIGITS = 18;

export function sanitizeAccountNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, BANK_ACCOUNT_MAX_DIGITS);
}

export function sanitizeIfsc(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11);
}

export function isValidBankAccountNumber(value: unknown): boolean {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  return digits.length >= BANK_ACCOUNT_MIN_DIGITS && digits.length <= BANK_ACCOUNT_MAX_DIGITS;
}

export function isValidIfsc(value: unknown): boolean {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(code);
}

/** User-facing hint when IFSC is filled but fails validation. */
export function getIfscValidationMessage(value: unknown): string | null {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!code) return null;
  if (isValidIfsc(code)) return null;
  if (code.length < 11) {
    return `IFSC must be 11 characters (you entered ${code.length}). Example: SBIN0001234`;
  }
  if (code[4] !== "0") {
    return "The 5th character of IFSC must be 0 (e.g. SBIN0001234)";
  }
  return "Invalid IFSC — use 4 bank letters + 0 + 6 branch characters (e.g. SBIN0001234)";
}

/** User-facing hint when account number is filled but fails validation. */
export function getBankAccountValidationMessage(value: unknown): string | null {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (!digits) return null;
  if (isValidBankAccountNumber(value)) return null;
  return `Account number must be 9–18 digits (you entered ${digits.length})`;
}

export const ONBOARDING_BANK_ACCOUNT_TYPE_OPTIONS = [
  { value: "savings", label: "Savings" },
  { value: "current", label: "Current" },
] as const;
