import {
  ONBOARDING_AGREEMENT_TYPES,
  ONBOARDING_IDENTITY_DOCUMENTS,
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_INVITATION_TTL_HOURS,
  ONBOARDING_OTP_TTL_MINUTES,
  ONBOARDING_POLICY_DOCUMENTS,
  ONBOARDING_ROUTES,
  ONBOARDING_SESSION_COOKIE,
  ONBOARDING_SESSION_TTL_DAYS,
  ONBOARDING_SIGNATURE_STYLES,
  ONBOARDING_STATUSES,
  ONBOARDING_STATUS_LABELS,
  ONBOARDING_STORAGE_BUCKET,
  ONBOARDING_WIZARD_SECTIONS,
} from "@/types/onboarding";

export {
  ONBOARDING_AGREEMENT_TYPES,
  ONBOARDING_IDENTITY_DOCUMENTS,
  ONBOARDING_EMPLOYMENT_DOCUMENTS,
  ONBOARDING_INVITATION_TTL_HOURS,
  ONBOARDING_OTP_TTL_MINUTES,
  ONBOARDING_POLICY_DOCUMENTS,
  ONBOARDING_ROUTES,
  ONBOARDING_SESSION_COOKIE,
  ONBOARDING_SESSION_TTL_DAYS,
  ONBOARDING_SIGNATURE_STYLES,
  ONBOARDING_STATUSES,
  ONBOARDING_STATUS_LABELS,
  ONBOARDING_STORAGE_BUCKET,
  ONBOARDING_WIZARD_SECTIONS,
};

export const ONBOARDING_PERMISSIONS = {
  view: "onboarding.view",
  manage: "onboarding.manage",
  review: "onboarding.review",
  activate: "onboarding.activate",
} as const;

export function onboardingInviteUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}${ONBOARDING_ROUTES.invite(token)}`;
}

export function companyEmailDomain(organizationName: string): string {
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return slug ? `${slug}.com` : "company.com";
}
