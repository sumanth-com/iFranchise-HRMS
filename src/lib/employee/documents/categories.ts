/**
 * Client-safe document category configuration for the Employee Self-Service
 * document explorer. Keeps only pure data (no server or React imports) so it can
 * be shared by the server aggregation query and the client explorer UI.
 */

export const EMPLOYEE_DOC_CATEGORY_ORDER = [
  "personal",
  "identity",
  "company",
  "payroll",
  "education",
  "previous_employment",
  "certifications",
  "other",
] as const;

export type EmployeeDocCategoryKey = (typeof EMPLOYEE_DOC_CATEGORY_ORDER)[number];

export const EMPLOYEE_DOC_CATEGORY_LABELS: Record<EmployeeDocCategoryKey, string> = {
  personal: "Personal Documents",
  identity: "Identity Documents",
  company: "Company Documents",
  payroll: "Payroll & Tax",
  education: "Education",
  previous_employment: "Previous Employment",
  certifications: "Professional Certifications",
  other: "Other Documents",
};

export const EMPLOYEE_DOC_CATEGORY_DESCRIPTIONS: Record<EmployeeDocCategoryKey, string> = {
  personal: "Resume and photo",
  identity: "Aadhaar, PAN, Passport, Licenses",
  company: "Offer, appointment & HR letters",
  payroll: "Payslips, Form 16 & tax proofs",
  education: "10th, Intermediate/Diploma, Graduation & more",
  previous_employment: "Offer, experience, relieving & payslips",
  certifications: "Professional certificates & licenses",
  other: "Up to 3 custom documents you can rename",
};

/**
 * Ordered slot codes shown as pending upload cards inside each folder.
 * Only these codes appear as empty slots; company HR letters remain listed as-is.
 */
export const EXPLORER_SLOT_CODES: Record<EmployeeDocCategoryKey, readonly string[]> = {
  personal: ["PROFILE_PHOTO", "RESUME"],
  identity: ["AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE", "VISA"],
  company: [
    "OFFER_LETTER",
    "APPOINTMENT_LETTER",
    "EMPLOYMENT_AGREEMENT",
    "NDA",
    "SALARY_REVISION_LETTER",
    "PROMOTION_LETTER",
    "CONFIRMATION_LETTER",
    "WARNING_LETTER",
    "APPRECIATION_LETTER",
    "TERMINATION_LETTER",
    "RESIGNATION_ACCEPTANCE_LETTER",
    "SETTLEMENT_LETTER",
  ],
  payroll: ["PAYSLIP", "FORM_16", "TAX_DOCUMENT"],
  education: [
    "EDUCATION_10TH",
    "EDUCATION_INTERMEDIATE",
    "EDUCATION_GRADUATION",
    "EDUCATION_ADDITIONAL",
  ],
  previous_employment: [
    "PREVIOUS_OFFER_LETTER",
    "EXPERIENCE_LETTER",
    "RELIEVING_LETTER",
    "PREVIOUS_PAYSLIPS",
  ],
  certifications: ["CERTIFICATION", "PROFESSIONAL_LICENSE"],
  other: ["OTHER_SLOT_1", "OTHER_SLOT_2", "OTHER_SLOT_3"],
};

/** Types that allow many files (period-based), not a single slot. */
export const MULTI_FILE_DOCUMENT_CODES = new Set([
  "PAYSLIP",
  "FORM_16",
  "TAX_DOCUMENT",
  "PREVIOUS_PAYSLIPS",
]);

/** Payroll-style period picker (year + month). Form 16 / Tax use year only in the UI. */
export const PERIOD_PICKER_CODES = new Set([
  "PAYSLIP",
  "FORM_16",
  "TAX_DOCUMENT",
  "PREVIOUS_PAYSLIPS",
]);

/** Slots where the employee can rename the display title. */
export const RENAMEABLE_DOCUMENT_CODES = new Set([
  "OTHER_SLOT_1",
  "OTHER_SLOT_2",
  "OTHER_SLOT_3",
  "EDUCATION_ADDITIONAL",
  "TAX_DOCUMENT",
]);

/** Nested folders under Payroll & Tax. */
export const PAYROLL_NESTED_FOLDERS = [
  {
    code: "PAYSLIP",
    name: "Payslips",
    description: "Monthly payslips by year and month",
  },
  {
    code: "FORM_16",
    name: "Form 16",
    description: "Annual Form 16 by financial year",
  },
  {
    code: "TAX_DOCUMENT",
    name: "Tax Documents",
    description: "Tax proofs by year",
  },
] as const;

export type PayrollNestedCode = (typeof PAYROLL_NESTED_FOLDERS)[number]["code"];

/** Seed / ensure catalogue for explorer slots (name + code + description). */
export const EXPLORER_DOCUMENT_TYPE_SEED: ReadonlyArray<{
  name: string;
  code: string;
  description: string;
  isRequired: boolean;
}> = [
  { name: "10th Class (all in one PDF)", code: "EDUCATION_10TH", description: "Class 10 marksheets and certificates combined", isRequired: false },
  { name: "Intermediate / Diploma", code: "EDUCATION_INTERMEDIATE", description: "Intermediate or diploma documents combined", isRequired: false },
  { name: "Graduation (all in one PDF)", code: "EDUCATION_GRADUATION", description: "Graduation certificates and transcripts combined", isRequired: false },
  { name: "Additional Education Documents", code: "EDUCATION_ADDITIONAL", description: "Any other education document", isRequired: false },
  { name: "Payslip", code: "PAYSLIP", description: "Monthly payslip (select year and month)", isRequired: false },
  { name: "Form 16", code: "FORM_16", description: "Annual Form 16 (select financial year)", isRequired: false },
  { name: "Tax Document", code: "TAX_DOCUMENT", description: "Tax proofs and related documents", isRequired: false },
  { name: "Offer Letter", code: "PREVIOUS_OFFER_LETTER", description: "Offer letter from previous employer", isRequired: false },
  { name: "Employment Payslips", code: "PREVIOUS_PAYSLIPS", description: "Payslips from previous employer", isRequired: false },
  { name: "Document 1", code: "OTHER_SLOT_1", description: "Custom document slot — rename as needed", isRequired: false },
  { name: "Document 2", code: "OTHER_SLOT_2", description: "Custom document slot — rename as needed", isRequired: false },
  { name: "Document 3", code: "OTHER_SLOT_3", description: "Custom document slot — rename as needed", isRequired: false },
  { name: "Professional Certificates", code: "CERTIFICATION", description: "Professional certificates combined in one PDF", isRequired: false },
  { name: "Professional License Certificates", code: "PROFESSIONAL_LICENSE", description: "Professional licence certificates", isRequired: false },
];

/** Document type codes (from hrms.document_types) grouped into explorer folders. */
const CODE_TO_CATEGORY: Record<string, EmployeeDocCategoryKey> = {
  PROFILE_PHOTO: "personal",
  RESUME: "personal",

  AADHAAR: "identity",
  PAN: "identity",
  PASSPORT: "identity",
  DRIVING_LICENSE: "identity",
  VISA: "identity",

  OFFER_LETTER: "company",
  APPOINTMENT_LETTER: "company",
  EMPLOYMENT_AGREEMENT: "company",
  NDA: "company",
  SALARY_REVISION_LETTER: "company",
  PROMOTION_LETTER: "company",
  CONFIRMATION_LETTER: "company",
  WARNING_LETTER: "company",
  APPRECIATION_LETTER: "company",
  TERMINATION_LETTER: "company",
  RESIGNATION_ACCEPTANCE_LETTER: "company",
  SETTLEMENT_LETTER: "company",

  PAYSLIP: "payroll",
  FORM_16: "payroll",
  TAX_DOCUMENT: "payroll",

  EDUCATION_10TH: "education",
  EDUCATION_INTERMEDIATE: "education",
  EDUCATION_GRADUATION: "education",
  EDUCATION_ADDITIONAL: "education",

  PREVIOUS_OFFER_LETTER: "previous_employment",
  EXPERIENCE_LETTER: "previous_employment",
  RELIEVING_LETTER: "previous_employment",
  PREVIOUS_PAYSLIPS: "previous_employment",

  CERTIFICATION: "certifications",
  PROFESSIONAL_LICENSE: "certifications",
  // Legacy general certificate → other so it no longer crowds Professional Certifications.
  CERTIFICATE: "other",

  OTHER_SLOT_1: "other",
  OTHER_SLOT_2: "other",
  OTHER_SLOT_3: "other",
  OTHER: "other",
};

export function categoryForCode(code: string | null | undefined): EmployeeDocCategoryKey {
  if (!code) return "other";
  return CODE_TO_CATEGORY[code.toUpperCase()] ?? "other";
}

export function isMultiFileDocumentCode(code: string | null | undefined): boolean {
  return MULTI_FILE_DOCUMENT_CODES.has(String(code ?? "").toUpperCase());
}

export function isPeriodPickerDocumentCode(code: string | null | undefined): boolean {
  return PERIOD_PICKER_CODES.has(String(code ?? "").toUpperCase());
}

export function isRenameableDocumentCode(code: string | null | undefined): boolean {
  return RENAMEABLE_DOCUMENT_CODES.has(String(code ?? "").toUpperCase());
}

export function slotCodesForCategory(key: EmployeeDocCategoryKey): readonly string[] {
  return EXPLORER_SLOT_CODES[key];
}
