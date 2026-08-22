"use server";

import { sendEmail } from "@/lib/email/mailer";
import { onboardingActionErrorMessage } from "@/lib/onboarding/action-error-message";
import { onboardingPortalErrorMessage } from "@/lib/onboarding/onboarding-errors";
import { renderOnboardingOtpEmail } from "@/lib/onboarding/email-templates";
import {
  getCandidateCaseIdFromSession,
  setCandidateSession,
  clearCandidateSession,
} from "@/lib/onboarding/candidate-session";
import {
  consumeOnboardingInvitationToken,
  createPortalSession,
  generateOtpCode,
  markInvitationViewed,
  storePortalOtp,
  storePortalPassword,
  validateOnboardingInvitationToken,
  verifyPortalLogin,
  verifyPortalOtp,
} from "@/lib/onboarding/onboarding-security";
import {
  saveAgreementAcceptances,
  saveOnboardingSection,
  saveOnboardingSignature,
  savePolicyAcknowledgements,
  submitOnboardingForReview,
  uploadOnboardingDocument,
} from "@/lib/onboarding/services/onboarding-mutations";
import { getCandidatePortalContext } from "@/lib/onboarding/services/onboarding-queries";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { hashEmailVerificationToken } from "@/lib/security/signed-flow-tokens";
import {
  ONBOARDING_EDUCATION_LARGE_UPLOAD_CODES,
  ONBOARDING_EDUCATION_LARGE_UPLOAD_MAX_BYTES,
  ONBOARDING_UPLOAD_MAX_BYTES,
} from "@/lib/onboarding/constants";
import {
  ONBOARDING_ALLOWED_EXTENSIONS,
  ONBOARDING_ALLOWED_MIME_TYPES,
  validateUploadFile,
} from "@/lib/security/upload-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  agreementAcceptanceSchema,
  candidateLoginSchema,
  candidateOtpRequestSchema,
  candidateOtpVerifySchema,
  candidatePasswordSchema,
  onboardingSectionSchema,
  onboardingSignatureSchema,
  policyAcknowledgementSchema,
} from "@/lib/validations/onboarding";

type ActionResult = { success: true; message: string } | { success: false; message: string };

function onboardingRateLimitKey(scope: string, email: string, ip?: string | null): string {
  const normalizedEmail = email.trim().toLowerCase();
  const ipPart = hashEmailVerificationToken(`ip:${ip ?? "unknown"}`);
  return `onboarding:${scope}:${ipPart}:${normalizedEmail}`;
}

async function assertOnboardingRateLimit(
  scope: string,
  email: string,
  limit: number,
  windowMs: number,
) {
  const ctx = await getRequestAuditContext();
  assertRateLimit({
    key: onboardingRateLimitKey(scope, email, ctx.ipAddress),
    limit,
    windowMs,
  });
}

export async function validateInviteTokenAction(rawToken: string) {
  return validateOnboardingInvitationToken(rawToken);
}

export async function setupCandidateAccountAction(
  rawToken: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const validation = await validateOnboardingInvitationToken(rawToken);
    if (!validation.ok) return { success: false, message: validation.reason };

    const parsed = candidatePasswordSchema.parse(input);
    if (validation.data.personalEmail.toLowerCase() !== validation.data.personalEmail.toLowerCase()) {
      // email comes from invite
    }

    await markInvitationViewed(validation.data.caseId);
    await storePortalPassword(validation.data.caseId, validation.data.personalEmail, parsed.password);
    await consumeOnboardingInvitationToken(rawToken);

    const session = await createPortalSession(validation.data.caseId);
    await setCandidateSession(session);

    return { success: true, message: "Account created" };
  } catch (error) {
    return {
      success: false,
      message: onboardingPortalErrorMessage(error, "Account setup failed. Please try again."),
    };
  }
}

export async function candidateLoginAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = candidateLoginSchema.parse(input);
    try {
      await assertOnboardingRateLimit("login", parsed.personalEmail, 5, 15 * 60 * 1000);
    } catch {
      return { success: false, message: "Too many login attempts. Please try again later." };
    }

    const caseId = await verifyPortalLogin(parsed.personalEmail, parsed.password);
    if (!caseId) return { success: false, message: "Invalid email or password" };

    const session = await createPortalSession(caseId);
    await setCandidateSession(session);
    return { success: true, message: "Signed in" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Login failed" };
  }
}

export async function requestCandidateOtpAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = candidateOtpRequestSchema.parse(input);
    try {
      await assertOnboardingRateLimit("otp-request", parsed.personalEmail, 3, 60 * 60 * 1000);
    } catch {
      return { success: false, message: "Too many code requests. Please try again later." };
    }

    const admin = createAdminClient();
    const { data: account } = await admin
      .schema("hrms")
      .from("onboarding_portal_accounts")
      .select("case_id, is_active")
      .eq("personal_email", parsed.personalEmail.trim().toLowerCase())
      .maybeSingle();

    if (!account?.is_active) {
      return { success: false, message: "No active onboarding account found for this email" };
    }

    const otp = generateOtpCode();
    await storePortalOtp(account.case_id, parsed.personalEmail, otp);

    const otpEmail = renderOnboardingOtpEmail({
      otp,
      personalEmail: parsed.personalEmail.trim().toLowerCase(),
    });

    const emailResult = await sendEmail({
      to: parsed.personalEmail.trim().toLowerCase(),
      subject: otpEmail.subject,
      html: otpEmail.html,
      text: otpEmail.text,
    });

    if (!emailResult.delivered) {
      if (emailResult.skipped) {
        return {
          success: false,
          message:
            emailResult.error ??
            "Verification email could not be sent — SMTP is not configured. Contact HR for assistance.",
        };
      }
      return {
        success: false,
        message: emailResult.error ?? "Failed to send verification code. Please try again.",
      };
    }

    return { success: true, message: "Verification code sent to your email" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "OTP request failed" };
  }
}

export async function verifyCandidateOtpAction(input: unknown): Promise<ActionResult> {
  try {
    const parsed = candidateOtpVerifySchema.parse(input);
    try {
      await assertOnboardingRateLimit("otp-verify", parsed.personalEmail, 5, 15 * 60 * 1000);
    } catch {
      return { success: false, message: "Too many verification attempts. Please try again later." };
    }

    const caseId = await verifyPortalOtp(parsed.personalEmail, parsed.otp);
    if (!caseId) return { success: false, message: "Invalid or expired code" };

    const session = await createPortalSession(caseId);
    await setCandidateSession(session);
    return { success: true, message: "Verified" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Verification failed" };
  }
}

export async function getCandidatePortalContextAction() {
  const caseId = await getCandidateCaseIdFromSession();
  if (!caseId) return null;
  return getCandidatePortalContext(caseId);
}

export async function saveCandidateSectionAction(input: unknown): Promise<ActionResult> {
  try {
    const caseId = await getCandidateCaseIdFromSession();
    if (!caseId) return { success: false, message: "Session expired. Please sign in again." };

    const parsed = onboardingSectionSchema.parse(input);
    if (parsed.caseId !== caseId) return { success: false, message: "Invalid session" };

    const admin = createAdminClient();
    await saveOnboardingSection(admin, caseId, parsed.sectionKey, parsed.data, parsed.markComplete);
    return { success: true, message: "Saved" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Save failed" };
  }
}

export async function uploadCandidateDocumentAction(formData: FormData): Promise<ActionResult> {
  try {
    const caseId = await getCandidateCaseIdFromSession();
    if (!caseId) return { success: false, message: "Session expired" };

    const admin = createAdminClient();
    const { data: caseRow } = await admin
      .schema("hrms")
      .from("onboarding_cases")
      .select("organization_id")
      .eq("id", caseId)
      .single();

    if (!caseRow) return { success: false, message: "Case not found" };

    const file = formData.get("file") as File | null;
    const documentCategory = String(formData.get("documentCategory") ?? "");
    const documentTypeCode = String(formData.get("documentTypeCode") ?? "");

    if (!file || !documentCategory || !documentTypeCode) {
      return { success: false, message: "Missing upload fields" };
    }

    validateUploadFile({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      maxBytes: ONBOARDING_EDUCATION_LARGE_UPLOAD_CODES.has(documentTypeCode)
        ? ONBOARDING_EDUCATION_LARGE_UPLOAD_MAX_BYTES
        : ONBOARDING_UPLOAD_MAX_BYTES,
      allowedExtensions: ONBOARDING_ALLOWED_EXTENSIONS,
      allowedMimeTypes: ONBOARDING_ALLOWED_MIME_TYPES,
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadOnboardingDocument(admin, caseId, caseRow.organization_id, {
      documentCategory,
      documentTypeCode,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      bytes,
    });

    return { success: true, message: "Document uploaded" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Upload failed" };
  }
}

export async function saveCandidatePoliciesAction(input: unknown): Promise<ActionResult> {
  try {
    const caseId = await getCandidateCaseIdFromSession();
    if (!caseId) return { success: false, message: "Session expired" };

    const parsed = policyAcknowledgementSchema.parse(input);
    if (parsed.caseId !== caseId) return { success: false, message: "Invalid session" };

    await savePolicyAcknowledgements(caseId, parsed.policyCodes);
    return { success: true, message: "Policies acknowledged" };
  } catch (error) {
    return {
      success: false,
      message: onboardingActionErrorMessage(error, "Could not update policy acknowledgements"),
    };
  }
}

export async function saveCandidateAgreementsAction(input: unknown): Promise<ActionResult> {
  try {
    const caseId = await getCandidateCaseIdFromSession();
    if (!caseId) return { success: false, message: "Session expired" };

    const parsed = agreementAcceptanceSchema.parse(input);
    if (parsed.caseId !== caseId) return { success: false, message: "Invalid session" };

    await saveAgreementAcceptances(caseId, parsed.agreementTypes);
    return { success: true, message: "Agreements accepted" };
  } catch (error) {
    return {
      success: false,
      message: onboardingActionErrorMessage(error, "Could not update agreement acceptances"),
    };
  }
}

export async function saveCandidateSignatureAction(input: unknown): Promise<ActionResult> {
  try {
    const caseId = await getCandidateCaseIdFromSession();
    if (!caseId) return { success: false, message: "Session expired" };

    const parsed = onboardingSignatureSchema.parse(input);
    if (parsed.caseId !== caseId) return { success: false, message: "Invalid session" };

    await saveOnboardingSignature(caseId, {
      signatureType: parsed.signatureType,
      signatureStyle: parsed.signatureStyle,
      signatureData: parsed.signatureData,
    });

    return { success: true, message: "Signature saved" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Save failed" };
  }
}

export async function submitCandidateOnboardingAction(): Promise<ActionResult> {
  try {
    const caseId = await getCandidateCaseIdFromSession();
    if (!caseId) return { success: false, message: "Session expired" };

    await submitOnboardingForReview(caseId);
    await clearCandidateSession();
    return { success: true, message: "Onboarding submitted for HR review" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Submit failed" };
  }
}

export async function candidateLogoutAction(): Promise<void> {
  await clearCandidateSession();
}
