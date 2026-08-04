import {
  educationDocumentTypeCode,
  educationLevelLabel,
  parseEducationEntries,
} from "@/lib/onboarding/education-utils";
import { isValidBankAccountNumber, isValidIfsc } from "@/lib/onboarding/bank-field-utils";
import { isValidStoredPhone } from "@/lib/onboarding/personal-field-options";
import {
  ONBOARDING_AGREEMENT_TYPES,
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_IDENTITY_DOCUMENTS,
  ONBOARDING_POLICY_DOCUMENTS,
  ONBOARDING_WIZARD_SECTIONS,
  type CandidatePortalContext,
  type OnboardingEducationEntry,
  type OnboardingWizardSection,
} from "@/types/onboarding";

const PERSONAL_REQUIRED: { key: string; label: string }[] = [
  { key: "fullName", label: "Full name" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "address", label: "Address" },
  { key: "emergencyContact", label: "Emergency contact" },
  { key: "personalMobile", label: "Personal mobile" },
  { key: "personalEmail", label: "Personal email" },
];

const BANK_REQUIRED: { key: string; label: string }[] = [
  { key: "bankName", label: "Bank name" },
  { key: "accountNumber", label: "Account number" },
  { key: "ifsc", label: "IFSC" },
];

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function sectionData(
  context: CandidatePortalContext,
  sectionKey: OnboardingWizardSection,
  patch?: Record<string, string>,
): Record<string, unknown> {
  const saved = context.sections.find((s) => s.sectionKey === sectionKey)?.data ?? {};
  return { ...saved, ...patch };
}

function hasUploadedDocument(
  context: CandidatePortalContext,
  category: string,
  typeCode: string,
): boolean {
  return context.documents.some(
    (doc) => doc.documentCategory === category && doc.documentTypeCode === typeCode,
  );
}

export type SectionValidationResult = {
  valid: boolean;
  missing: string[];
};

export function validateEducationSection(
  context: CandidatePortalContext,
  entries: OnboardingEducationEntry[],
): SectionValidationResult {
  const missing: string[] = [];

  if (entries.length === 0) {
    missing.push("At least one education qualification");
    return { valid: false, missing };
  }

  for (const entry of entries) {
    const label = educationLevelLabel(entry.level);
    if (!hasText(entry.institutionName)) {
      missing.push(`${label} — school / college name`);
    }
    if (!hasUploadedDocument(context, "education", educationDocumentTypeCode(entry.id))) {
      missing.push(`${label} — certificate upload`);
    }
  }

  return { valid: missing.length === 0, missing };
}

export function validateOnboardingSection(
  sectionKey: OnboardingWizardSection,
  context: CandidatePortalContext,
  patch?: Record<string, string>,
): SectionValidationResult {
  const missing: string[] = [];
  const data = sectionData(context, sectionKey, patch);

  switch (sectionKey) {
    case "personal":
      for (const field of PERSONAL_REQUIRED) {
        if (field.key === "personalMobile" || field.key === "emergencyContact") {
          if (!isValidStoredPhone(data[field.key])) missing.push(field.label);
        } else if (!hasText(data[field.key])) {
          missing.push(field.label);
        }
      }
      break;

    case "identity":
      for (const doc of ONBOARDING_IDENTITY_DOCUMENTS) {
        if (doc.required && !hasUploadedDocument(context, "identity", doc.code)) {
          missing.push(doc.label);
        }
      }
      if (!hasText(data.aadhaar)) missing.push("Aadhaar number");
      if (!hasText(data.pan)) missing.push("PAN number");
      break;

    case "education":
      const entries = parseEducationEntries(data);
      return validateEducationSection(context, entries);

    case "employment_history":
      for (const doc of ONBOARDING_EMPLOYMENT_DOCUMENTS) {
        if (doc.required && !hasUploadedDocument(context, "employment", doc.code)) {
          missing.push(doc.label);
        }
      }
      break;

    case "bank":
      for (const field of BANK_REQUIRED) {
        if (!hasText(data[field.key])) missing.push(field.label);
      }
      if (hasText(data.accountNumber) && !isValidBankAccountNumber(data.accountNumber)) {
        missing.push("Valid account number (9–18 digits)");
      }
      if (hasText(data.ifsc) && !isValidIfsc(data.ifsc)) {
        missing.push("Valid IFSC code");
      }
      break;

    case "tax":
      break;

    case "policies":
      for (const policy of ONBOARDING_POLICY_DOCUMENTS) {
        if (!context.policyAcknowledgements.includes(policy.code)) {
          missing.push(policy.label);
        }
      }
      break;

    case "agreements":
      for (const agreement of ONBOARDING_AGREEMENT_TYPES) {
        if (!context.agreements.some((a) => a.agreementType === agreement.code)) {
          missing.push(agreement.label);
        }
      }
      break;

    case "signature":
      if (!context.signature) missing.push("Electronic signature");
      break;
  }

  return { valid: missing.length === 0, missing };
}

export function isOnboardingSectionComplete(
  sectionKey: OnboardingWizardSection,
  context: CandidatePortalContext,
): boolean {
  const saved = context.sections.find((s) => s.sectionKey === sectionKey);
  return Boolean(saved?.completedAt);
}

export function getCompletedStepIndices(context: CandidatePortalContext): number[] {
  return ONBOARDING_WIZARD_SECTIONS.map((key, index) =>
    isOnboardingSectionComplete(key, context) ? index : -1,
  ).filter((index) => index >= 0);
}

export function getFirstIncompleteStepIndex(context: CandidatePortalContext): number {
  for (let i = 0; i < ONBOARDING_WIZARD_SECTIONS.length; i++) {
    if (!isOnboardingSectionComplete(ONBOARDING_WIZARD_SECTIONS[i], context)) return i;
  }
  return ONBOARDING_WIZARD_SECTIONS.length - 1;
}

/** Candidate may only open completed steps and the next incomplete step. */
export function canNavigateToStep(stepIndex: number, context: CandidatePortalContext): boolean {
  return stepIndex <= getFirstIncompleteStepIndex(context);
}

/** Highest step index the candidate may open (completed steps + one ahead). */
export function getMaxAccessibleStepIndex(context: CandidatePortalContext): number {
  return getFirstIncompleteStepIndex(context);
}

export function canSubmitOnboarding(context: CandidatePortalContext): SectionValidationResult {
  const missing: string[] = [];
  for (const key of ONBOARDING_WIZARD_SECTIONS) {
    const result = validateOnboardingSection(key, context);
    missing.push(...result.missing);
  }
  return { valid: missing.length === 0, missing };
}
