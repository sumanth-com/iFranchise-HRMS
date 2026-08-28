import { educationDocumentLabel } from "@/lib/onboarding/education-utils";
import { employmentDocumentLabel } from "@/lib/onboarding/employment-utils";
import { ONBOARDING_STEP_LABELS } from "@/lib/onboarding/onboarding-step-labels";
import {
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_IDENTITY_DOCUMENTS,
  ONBOARDING_WIZARD_SECTIONS,
  type CandidatePortalContext,
  type OnboardingDocumentRecord,
  type OnboardingWizardSection,
} from "@/types/onboarding";

export type OnboardingCorrectionItem = {
  documentId: string;
  sectionKey: OnboardingWizardSection;
  sectionLabel: string;
  documentLabel: string;
  hrComment: string | null;
  stepIndex: number;
};

export function hasOpenOnboardingCorrections(context: CandidatePortalContext): boolean {
  return (
    context.status === "corrections_requested" ||
    context.documents.some((doc) => doc.reviewStatus === "correction_requested")
  );
}

/** Latest upload per category + type (documents are ordered by created_at ascending). */
export function dedupeOnboardingDocuments(
  documents: OnboardingDocumentRecord[],
): OnboardingDocumentRecord[] {
  const bySlot = new Map<string, OnboardingDocumentRecord>();
  for (const doc of documents) {
    bySlot.set(`${doc.documentCategory}:${doc.documentTypeCode}`, doc);
  }
  return Array.from(bySlot.values());
}

export function getOnboardingDocumentForSlot(
  context: CandidatePortalContext,
  category: string,
  typeCode: string,
): OnboardingDocumentRecord | undefined {
  return context.documents.find(
    (doc) => doc.documentCategory === category && doc.documentTypeCode === typeCode,
  );
}

function catalogDocumentLabel(category: string, typeCode: string): string {
  if (category === "identity") {
    const match = ONBOARDING_IDENTITY_DOCUMENTS.find((d) => d.code === typeCode);
    if (match) return match.label;
  }
  if (category === "employment") {
    if (typeCode.startsWith("emp_")) return employmentDocumentLabel(typeCode);
    const match = ONBOARDING_EMPLOYMENT_DOCUMENTS.find((d) => d.code === typeCode);
    if (match) return match.label;
  }
  if (category === "bank" && typeCode === "cancelled_cheque") return "Cancelled Cheque";
  if (category === "education" && typeCode.startsWith("edu_")) {
    return educationDocumentLabel(typeCode);
  }
  return typeCode.replace(/_/g, " ");
}

function stepIndexForDocument(doc: OnboardingDocumentRecord): number {
  const category = doc.documentCategory;
  if (category === "identity") return ONBOARDING_WIZARD_SECTIONS.indexOf("identity");
  if (category === "education") return ONBOARDING_WIZARD_SECTIONS.indexOf("education");
  if (category === "employment") return ONBOARDING_WIZARD_SECTIONS.indexOf("employment_history");
  if (category === "bank") return ONBOARDING_WIZARD_SECTIONS.indexOf("bank");
  if (category === "offer_acceptance" || category === "signature") {
    return ONBOARDING_WIZARD_SECTIONS.indexOf("signature");
  }
  return 0;
}

export function sectionKeyHasCorrection(
  sectionKey: OnboardingWizardSection,
  documents: OnboardingDocumentRecord[],
): boolean {
  return documents.some(
    (doc) =>
      doc.reviewStatus === "correction_requested" && documentMatchesSection(sectionKey, doc),
  );
}

export function documentMatchesSection(
  sectionKey: OnboardingWizardSection,
  doc: OnboardingDocumentRecord,
): boolean {
  if (sectionKey === "identity" && doc.documentCategory === "identity") return true;
  if (sectionKey === "education" && doc.documentCategory === "education") return true;
  if (sectionKey === "employment_history" && doc.documentCategory === "employment") return true;
  if (sectionKey === "bank" && doc.documentCategory === "bank") return true;
  if (
    sectionKey === "signature" &&
    (doc.documentCategory === "offer_acceptance" || doc.documentCategory === "signature")
  ) {
    return true;
  }
  return false;
}

export function buildOnboardingCorrectionItems(
  context: CandidatePortalContext,
): OnboardingCorrectionItem[] {
  return dedupeOnboardingDocuments(context.documents)
    .filter((doc) => doc.reviewStatus === "correction_requested")
    .map((doc) => {
      const stepIndex = stepIndexForDocument(doc);
      const sectionKey = ONBOARDING_WIZARD_SECTIONS[stepIndex];
      return {
        documentId: doc.id,
        sectionKey,
        sectionLabel: ONBOARDING_STEP_LABELS[sectionKey] ?? sectionKey,
        documentLabel: catalogDocumentLabel(doc.documentCategory, doc.documentTypeCode),
        hrComment: doc.hrComment,
        stepIndex,
      };
    });
}
