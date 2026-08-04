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
