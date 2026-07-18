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
  personal: "Resume, photo and personal files",
  identity: "Aadhaar, PAN, Passport, Licenses",
  company: "Offer, appointment & HR letters",
  payroll: "Payslips, Form 16 & tax proofs",
  education: "Degrees, certificates & transcripts",
  previous_employment: "Experience & relieving letters",
  certifications: "Certificates, licenses & awards",
  other: "Miscellaneous files",
};

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

  EXPERIENCE_LETTER: "previous_employment",
  RELIEVING_LETTER: "previous_employment",

  CERTIFICATION: "certifications",
  PROFESSIONAL_LICENSE: "certifications",
  CERTIFICATE: "certifications",

  OTHER: "other",
};

export function categoryForCode(code: string | null | undefined): EmployeeDocCategoryKey {
  if (!code) return "other";
  return CODE_TO_CATEGORY[code.toUpperCase()] ?? "other";
}
