import type { OnboardingWizardSection } from "@/types/onboarding";

export const ONBOARDING_STEP_LABELS: Record<OnboardingWizardSection, string> = {
  personal: "Personal Details",
  identity: "Identity",
  education: "Education",
  employment_history: "Employment",
  bank: "Bank",
  terms: "Terms & conditions",
  signature: "Offer Acceptance",
};
