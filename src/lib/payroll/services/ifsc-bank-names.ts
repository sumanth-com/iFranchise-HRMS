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

/** True when a branch was actually saved and must not be replaced. */
export function isStoredBankBranch(value: string | null | undefined): boolean {
  const stored = (value ?? "").trim();
  if (!stored || stored === "—" || stored === "-") return false;
  if (/^pending-/i.test(stored)) return false;
  if (stored.toLowerCase() === "imported") return false;
  return true;
}

/**
 * Keep a saved branch. Use an IFSC lookup only when the stored branch is missing.
 */
export function applyIfscBranch<
  T extends {
    bankName?: string | null;
    ifscCode?: string | null;
    branchName?: string | null;
  },
>(
  bank: T,
  resolved: { bankName?: string | null; branchName?: string | null } | null,
): T {
  const bankName =
    resolveEmployeeBankName(bank.bankName, bank.ifscCode) ||
    resolved?.bankName?.trim() ||
    bank.bankName;
  if (isStoredBankBranch(bank.branchName)) {
    return { ...bank, bankName };
  }
  const branchName = resolved?.branchName?.trim() || null;
  if (!branchName) return { ...bank, bankName };
  return { ...bank, bankName, branchName };
}

/** Prefer stored bank name; fall back to IFSC-derived name. */
export function resolveEmployeeBankName(
  bankName: string | null | undefined,
  ifscCode: string | null | undefined,
): string {
  const stored = (bankName ?? "").trim();
  const isImportedPlaceholder = stored.toLowerCase() === "imported";
  const isPlaceholder =
    !stored ||
    isImportedPlaceholder ||
    /^pending-/i.test(stored) ||
    stored.toLowerCase() === "bank";

  if (!isPlaceholder) {
    return stored;
  }

  return resolveBankNameFromIfsc(ifscCode) ?? (isImportedPlaceholder || !stored ? "—" : stored);
}
