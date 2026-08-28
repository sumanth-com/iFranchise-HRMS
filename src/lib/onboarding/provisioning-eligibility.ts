import { canSubmitOnboarding } from "@/lib/onboarding/onboarding-section-validation";
import { getOnboardingPortalAuthUserId } from "@/lib/onboarding/onboarding-security";
import type {
  CandidatePortalContext,
  OnboardingCaseDetail,
  OnboardingStatus,
} from "@/types/onboarding";

const PROVISIONING_ELIGIBLE_STATUSES: OnboardingStatus[] = ["pending_hr_review"];

export function onboardingDetailToPortalContext(
  detail: OnboardingCaseDetail,
): CandidatePortalContext {
  return {
    caseId: detail.id,
    fullName: detail.fullName,
    personalEmail: detail.personalEmail,
    status: detail.status,
    completionPercent: detail.completionPercent,
    joiningDate: detail.joiningDate,
    correctionNotes: detail.correctionNotes,
    locked: false,
    sections: detail.sections,
    documents: detail.documents,
    policyAcknowledgements: detail.policyAcknowledgements,
    agreements: detail.agreements,
    signature: detail.signature,
    offerLetter: null,
  };
}

export function isOnboardingSubmittedForReview(detail: OnboardingCaseDetail): boolean {
  return Boolean(detail.submittedAt) && PROVISIONING_ELIGIBLE_STATUSES.includes(detail.status);
}

export function isOnboardingDataComplete(detail: OnboardingCaseDetail): boolean {
  const validation = canSubmitOnboarding(onboardingDetailToPortalContext(detail));
  return validation.valid;
}

export async function isOnboardingPortalReady(caseId: string): Promise<boolean> {
  const authUserId = await getOnboardingPortalAuthUserId(caseId);
  return Boolean(authUserId);
}

export async function assertOnboardingProvisioningEligible(
  detail: OnboardingCaseDetail,
): Promise<void> {
  if (detail.employeeId) {
    throw new Error("This candidate has already been provisioned.");
  }

  if (!isOnboardingSubmittedForReview(detail)) {
    throw new Error(
      "Only candidates who submitted onboarding for HR review can be provisioned.",
    );
  }

  if (!isOnboardingDataComplete(detail)) {
    throw new Error(
      "Onboarding is incomplete. Required information or documents are still missing.",
    );
  }

  const portalReady = await isOnboardingPortalReady(detail.id);
  if (!portalReady) {
    throw new Error(
      "The candidate has not finished portal password setup. Ask them to complete onboarding login first.",
    );
  }
}

export type ProvisioningEligibleCandidate = {
  caseId: string;
  fullName: string;
  personalEmail: string;
  departmentName: string | null;
  designationName: string | null;
  employmentTypeName: string | null;
  intendedRoleId: string;
  intendedRoleName: string;
  completionPercent: number;
  submittedAt: string;
  joiningDate: string | null;
};

export function mapDetailToEligibleCandidate(
  detail: OnboardingCaseDetail,
): ProvisioningEligibleCandidate {
  return {
    caseId: detail.id,
    fullName: detail.fullName,
    personalEmail: detail.personalEmail,
    departmentName: detail.departmentName,
    designationName: detail.designationName,
    employmentTypeName: detail.employmentTypeName,
    intendedRoleId: detail.intendedRoleId,
    intendedRoleName: detail.intendedRoleName,
    completionPercent: detail.completionPercent,
    submittedAt: detail.submittedAt ?? "",
    joiningDate: detail.joiningDate,
  };
}
