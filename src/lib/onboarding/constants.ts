import { siteConfig } from "@/config/site";
import { DEFAULT_DOCUMENT_SETTINGS } from "@/lib/documents/constants";

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

/** Onboarding uploads capped at 10 MB per file. */
export const ONBOARDING_UPLOAD_MAX_MB = 10;
export const ONBOARDING_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** PDF and common image formats only (all onboarding document cards). */
export const ONBOARDING_DOCUMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

export const ONBOARDING_DOCUMENT_UPLOAD_HINT = `PDF or image only · max ${ONBOARDING_UPLOAD_MAX_MB} MB`;

export const ONBOARDING_DOCUMENT_ALLOWED_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;

export const ONBOARDING_DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** @deprecated Use ONBOARDING_DOCUMENT_ALLOWED_EXTENSIONS for onboarding uploads. */
export const ONBOARDING_ALLOWED_FILE_TYPES = DEFAULT_DOCUMENT_SETTINGS.allowedFileTypes;

export function onboardingInviteUrl(token: string): string {
  return `${siteConfig.url}${ONBOARDING_ROUTES.invite(token)}`;
}

export function companyEmailDomain(organizationName: string): string {
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return slug ? `${slug}.com` : "company.com";
}
