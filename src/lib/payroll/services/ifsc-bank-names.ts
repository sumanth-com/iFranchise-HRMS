/** RBI IFSC bank-code (first 4 chars) → institution name. */
const IFSC_BANK_CODE_NAMES: Record<string, string> = {
  SBIN: "State Bank of India",
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  PUNB: "Punjab National Bank",
  CNRB: "Canara Bank",
  PSIB: "Punjab & Sind Bank",
  DBSS: "DBS Bank India",
  IDFB: "IDFC FIRST Bank",
  YESB: "Yes Bank",
  INDB: "IndusInd Bank",
  FDRL: "Federal Bank",
  BARB: "Bank of Baroda",
  BKID: "Bank of India",
  MAHB: "Bank of Maharashtra",
  UBIN: "Union Bank of India",
  IOBA: "Indian Overseas Bank",
  IDIB: "Indian Bank",
  CIUB: "City Union Bank",
  KVBL: "Karur Vysya Bank",
  SCBL: "Standard Chartered Bank",
  HSBC: "HSBC Bank",
};

/** Full IFSC overrides for gramin / sponsored-bank codes. */
const IFSC_FULL_OVERRIDES: Record<string, string> = {
  PUNB0HPGB04: "Himachal Pradesh Gramin Bank",
};

/**
 * Resolve the bank institution name from an IFSC code.
 * Uses exact overrides first, then the 4-character bank code.
 */
export function resolveBankNameFromIfsc(ifscCode: string | null | undefined): string | null {
  const code = (ifscCode ?? "").trim().toUpperCase();
  if (!code) return null;

  if (IFSC_FULL_OVERRIDES[code]) {
    return IFSC_FULL_OVERRIDES[code];
  }

  const bankCode = code.slice(0, 4);
  return IFSC_BANK_CODE_NAMES[bankCode] ?? null;
}

/** Prefer stored bank name; fall back to IFSC-derived name. */
export function resolveEmployeeBankName(
  bankName: string | null | undefined,
  ifscCode: string | null | undefined,
): string {
  const stored = (bankName ?? "").trim();
  if (stored && !/^pending-/i.test(stored) && stored.toLowerCase() !== "bank") {
    return stored;
  }
  return resolveBankNameFromIfsc(ifscCode) ?? stored ?? "—";
}
