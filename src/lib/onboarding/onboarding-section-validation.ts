import {
  EMPLOYMENT_ENTRY_DOCUMENTS,
  employmentDocumentTypeCode,
  isValidEmploymentDates,
  parseEmploymentForm,
  type OnboardingEmploymentFormData,
} from "@/lib/onboarding/employment-utils";
import {
  EDUCATION_DOCUMENT_CODES,
  parseEducationForm,
  type OnboardingEducationFormData,
} from "@/lib/onboarding/education-utils";
import { isValidEducationDateRange } from "@/lib/onboarding/education-options";
import { isValidBankAccountNumber, isValidIfsc } from "@/lib/onboarding/bank-field-utils";
import { isValidAadhaar, isValidPan } from "@/lib/onboarding/identity-field-utils";
import { isValidIndianPincode } from "@/lib/onboarding/india-locations";
import { isValidStoredPhone } from "@/lib/onboarding/personal-field-options";
import {
  ONBOARDING_AGREEMENT_TYPES,
  ONBOARDING_IDENTITY_DOCUMENTS,
  ONBOARDING_POLICY_DOCUMENTS,
  ONBOARDING_WIZARD_SECTIONS,
  type CandidatePortalContext,
  type OnboardingWizardSection,
} from "@/types/onboarding";

const PERSONAL_REQUIRED: { key: string; label: string }[] = [
  { key: "fullName", label: "Full name" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "state", label: "State" },
  { key: "city", label: "City / district" },
  { key: "pincode", label: "Pincode" },
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

function hasLegacyTermsAcknowledgement(context: CandidatePortalContext): boolean {
  const policiesComplete = ONBOARDING_POLICY_DOCUMENTS.every((policy) =>
    context.policyAcknowledgements.includes(policy.code),
  );
  const agreementsComplete = ONBOARDING_AGREEMENT_TYPES.every((agreement) =>
    context.agreements.some((item) => item.agreementType === agreement.code),
  );
  return policiesComplete && agreementsComplete;
}

export type SectionValidationResult = {
  valid: boolean;
  missing: string[];
};

export function validateEducationSection(
  context: CandidatePortalContext,
  form: OnboardingEducationFormData,
): SectionValidationResult {
  const missing: string[] = [];

  const sscFields: { key: keyof OnboardingEducationFormData["ssc"]; label: string }[] = [
    { key: "schoolName", label: "10th — school name" },
    { key: "board", label: "10th — board" },
    { key: "periodFrom", label: "10th — from date" },
    { key: "periodTo", label: "10th — to date" },
    { key: "percentageOrCgpa", label: "10th — percentage / CGPA" },
    { key: "rollNumber", label: "10th — roll / registration number" },
    { key: "placeOrState", label: "10th — place / state" },
  ];
  for (const field of sscFields) {
    if (!hasText(form.ssc[field.key])) missing.push(field.label);
  }
  if (
    (hasText(form.ssc.periodFrom) || hasText(form.ssc.periodTo)) &&
    !isValidEducationDateRange(form.ssc.periodFrom, form.ssc.periodTo)
  ) {
    missing.push("10th — valid from and to dates");
  }
  if (
    !hasUploadedDocument(context, "education", EDUCATION_DOCUMENT_CODES.ssc_marksheet)
  ) {
    missing.push("10th — marks memo / marksheet");
  }
  if (
    !hasUploadedDocument(context, "education", EDUCATION_DOCUMENT_CODES.ssc_certificate)
  ) {
    missing.push("10th — certificate");
  }

  const intermediateFields: {
    key: keyof OnboardingEducationFormData["intermediate"];
    label: string;
  }[] = [
    { key: "qualification", label: "12th — qualification" },
    { key: "schoolName", label: "12th — school / college name" },
    { key: "board", label: "12th — board" },
    { key: "stream", label: "12th — stream" },
    { key: "periodFrom", label: "12th — from date" },
    { key: "periodTo", label: "12th — to date" },
    { key: "percentageOrCgpa", label: "12th — percentage / CGPA" },
    { key: "rollNumber", label: "12th — roll / registration number" },
    { key: "collegeStateOrLocation", label: "12th — college state / location" },
  ];
  for (const field of intermediateFields) {
    if (!hasText(form.intermediate[field.key])) missing.push(field.label);
  }
  if (
    (hasText(form.intermediate.periodFrom) || hasText(form.intermediate.periodTo)) &&
    !isValidEducationDateRange(form.intermediate.periodFrom, form.intermediate.periodTo)
  ) {
    missing.push("12th — valid from and to dates");
  }
  if (
    !hasUploadedDocument(context, "education", EDUCATION_DOCUMENT_CODES.intermediate_marksheet)
  ) {
    missing.push("12th — marksheet");
  }
  if (
    !hasUploadedDocument(
      context,
      "education",
      EDUCATION_DOCUMENT_CODES.intermediate_certificate,
    )
  ) {
    missing.push("12th — passing certificate");
  }

  const graduationFields: {
    key: keyof OnboardingEducationFormData["graduation"];
    label: string;
  }[] = [
    { key: "degree", label: "Graduation — degree" },
    { key: "specialization", label: "Graduation — specialization / branch" },
    { key: "collegeName", label: "Graduation — college / institution" },
    { key: "university", label: "Graduation — university" },
    { key: "periodFrom", label: "Graduation — from date" },
    { key: "periodTo", label: "Graduation — to date" },
    { key: "percentageOrCgpa", label: "Graduation — percentage / CGPA" },
    { key: "rollNumber", label: "Graduation — roll / registration number" },
    { key: "stateOrLocation", label: "Graduation — state / location" },
  ];
  for (const field of graduationFields) {
    if (!hasText(form.graduation[field.key])) missing.push(field.label);
  }
  if (
    (hasText(form.graduation.periodFrom) || hasText(form.graduation.periodTo)) &&
    !isValidEducationDateRange(form.graduation.periodFrom, form.graduation.periodTo)
  ) {
    missing.push("Graduation — valid from and to dates");
  }
  if (
    !hasUploadedDocument(
      context,
      "education",
      EDUCATION_DOCUMENT_CODES.graduation_semester_marksheets,
    )
  ) {
    missing.push("Graduation — semester-wise mark sheets");
  }
  if (
    !hasUploadedDocument(
      context,
      "education",
      EDUCATION_DOCUMENT_CODES.graduation_degree_certificate,
    )
  ) {
    missing.push("Graduation — degree certificate");
  }

  return { valid: missing.length === 0, missing };
}

export function validateEmploymentSection(
  context: CandidatePortalContext,
  form: OnboardingEmploymentFormData,
): SectionValidationResult {
  const missing: string[] = [];

  if (form.noPriorExperience) {
    return { valid: true, missing };
  }

  if (form.entries.length === 0) {
    missing.push("At least one previous company");
    return { valid: false, missing };
  }

  for (const [index, entry] of form.entries.entries()) {
    const label = `Company ${index + 1}`;
    if (!hasText(entry.companyName)) missing.push(`${label} — company name`);
    if (!hasText(entry.companyLocation)) missing.push(`${label} — company location`);
    if (!hasText(entry.jobTitle)) missing.push(`${label} — job title`);
    if (!hasText(entry.department)) missing.push(`${label} — department`);
    if (!hasText(entry.employmentType)) missing.push(`${label} — employment type`);
    if (!hasText(entry.dateOfJoining)) missing.push(`${label} — date of joining`);
    if (!hasText(entry.dateOfLeaving)) missing.push(`${label} — date of leaving`);
    if (
      hasText(entry.dateOfJoining) &&
      hasText(entry.dateOfLeaving) &&
      !isValidEmploymentDates(entry.dateOfJoining, entry.dateOfLeaving)
    ) {
      missing.push(`${label} — valid joining and leaving dates`);
    }
    if (!hasText(entry.totalExperience)) missing.push(`${label} — total experience`);
    if (!hasText(entry.lastDrawnCtc)) missing.push(`${label} — last drawn CTC`);
    if (!hasText(entry.reasonForLeaving)) missing.push(`${label} — reason for leaving`);

    for (const doc of EMPLOYMENT_ENTRY_DOCUMENTS) {
      if (!doc.required) continue;
      const typeCode = employmentDocumentTypeCode(entry.id, doc.code);
      if (!hasUploadedDocument(context, "employment", typeCode)) {
        missing.push(`${label} — ${doc.label}`);
      }
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
      if (hasText(data.pincode) && !isValidIndianPincode(String(data.pincode))) {
        missing.push("Valid 6-digit pincode");
      }
      break;

    case "identity":
      for (const doc of ONBOARDING_IDENTITY_DOCUMENTS) {
        if (doc.required && !hasUploadedDocument(context, "identity", doc.code)) {
          missing.push(doc.label);
        }
      }
      if (!hasText(data.aadhaar) || !isValidAadhaar(data.aadhaar)) {
        missing.push("Valid 12-digit Aadhaar number");
      }
      if (!hasText(data.pan) || !isValidPan(data.pan)) {
        missing.push("Valid PAN (e.g. ABCDE1234F)");
      }
      break;

    case "education":
      return validateEducationSection(context, parseEducationForm(data));

    case "employment_history":
      return validateEmploymentSection(context, parseEmploymentForm(data));

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

    case "terms": {
      const accepted =
        data.termsAccepted === true ||
        data.termsAccepted === "true" ||
        hasLegacyTermsAcknowledgement(context);
      if (!accepted) {
        missing.push("Terms and conditions acknowledgement");
      }
      break;
    }

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
  if (saved?.completedAt) return true;
  if (sectionKey === "terms") {
    const data = saved?.data ?? {};
    return (
      data.termsAccepted === true ||
      data.termsAccepted === "true" ||
      hasLegacyTermsAcknowledgement(context)
    );
  }
  return false;
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
