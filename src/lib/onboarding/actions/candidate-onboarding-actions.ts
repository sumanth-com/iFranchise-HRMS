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
import { getCandidateOfferLetterFile, loadCandidateOfferLetter } from "@/lib/onboarding/services/candidate-offer-letter";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { hashEmailVerificationToken } from "@/lib/security/signed-flow-tokens";
import {
  ONBOARDING_DOCUMENT_ALLOWED_EXTENSIONS,
  ONBOARDING_DOCUMENT_ALLOWED_MIME_TYPES,
  ONBOARDING_UPLOAD_MAX_BYTES,
} from "@/lib/onboarding/constants";
import { validateUploadFile } from "@/lib/security/upload-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  agreementAcceptanceSchema,
  candidateLoginSchema,
  candidateOtpRequestSchema,
  candidateOtpVerifySchema,
  candidatePasswordSchema,
  candidatePasswordSetupSchema,
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
    // Persist password first so sign-in works even if token consume/session steps fail after.
    await storePortalPassword(validation.data.caseId, validation.data.personalEmail, parsed.password);
    try {
      await consumeOnboardingInvitationToken(rawToken);
    } catch (consumeError) {
      console.error("[onboarding] invite token consume after password save:", consumeError);
    }

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

/**
 * First-time password setup from /onboarding/sign-up (no invite token required).
 * Only works for invited candidates who do not already have a password.
 * The first password set is permanent for portal sign-in.
 */
export async function setupCandidatePasswordByEmailAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = candidatePasswordSetupSchema.parse(input);
    const email = parsed.personalEmail.trim().toLowerCase();

    try {
      await assertOnboardingRateLimit("password-setup", email, 5, 60 * 60 * 1000);
    } catch {
      return { success: false, message: "Too many setup attempts. Please try again later." };
    }

    const admin = createAdminClient();
    const { data: account, error: accountError } = await admin
      .schema("hrms")
      .from("onboarding_portal_accounts")
      .select("case_id, password_hash, is_active, personal_email")
      .eq("personal_email", email)
      .maybeSingle();

    if (accountError) throw new Error(accountError.message);

    if (!account?.is_active) {
      return {
        success: false,
        message:
          "No onboarding invitation found for this email. Use the invitation link from HR, or contact HR.",
      };
    }

    if (typeof account.password_hash === "string" && account.password_hash.length > 0) {
      return {
        success: false,
        message: "A password is already set for this email. Sign in with that password.",
      };
    }

    const { data: caseRow, error: caseError } = await admin
      .schema("hrms")
      .from("onboarding_cases")
      .select("id, status, deleted_at, cancelled_at, archived_at, onboarding_account_active")
      .eq("id", account.case_id)
      .maybeSingle();

    if (caseError) throw new Error(caseError.message);
    if (!caseRow || caseRow.deleted_at) {
      return { success: false, message: "Onboarding case not found for this email." };
    }
    if (caseRow.cancelled_at || caseRow.archived_at || !caseRow.onboarding_account_active) {
      return { success: false, message: "This onboarding account is no longer available." };
    }
    if (["cancelled", "archived", "completed", "rejected"].includes(caseRow.status)) {
      return { success: false, message: "This onboarding is closed. Contact HR for assistance." };
    }

    await markInvitationViewed(account.case_id);
    await storePortalPassword(account.case_id, email, parsed.password);

    const session = await createPortalSession(account.case_id);
    await setCandidateSession(session);

    return { success: true, message: "Password saved. You can sign in with this password anytime." };
  } catch (error) {
    return {
      success: false,
      message: onboardingPortalErrorMessage(error, "Could not set password. Please try again."),
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
      maxBytes: ONBOARDING_UPLOAD_MAX_BYTES,
      allowedExtensions: ONBOARDING_DOCUMENT_ALLOWED_EXTENSIONS,
      allowedMimeTypes: ONBOARDING_DOCUMENT_ALLOWED_MIME_TYPES,
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

export async function getCandidateOfferLetterUrlAction(): Promise<
  { success: true; url: string; fileName: string } | { success: false; message: string }
> {
  try {
    const caseId = await getCandidateCaseIdFromSession();
    if (!caseId) return { success: false, message: "Session expired" };

    const admin = createAdminClient();
    const { data: caseRow } = await admin
      .schema("hrms")
      .from("onboarding_cases")
      .select("organization_id, offer_reference_number, personal_email")
      .eq("id", caseId)
      .maybeSingle();

    if (!caseRow) return { success: false, message: "Case not found" };

    const offer = await loadCandidateOfferLetter(
      caseRow.organization_id as string,
      (caseRow.offer_reference_number as string | null) ?? null,
      caseRow.personal_email as string,
    );

    if (!offer) return { success: false, message: "Offer letter is not available yet" };

    const { data: signed, error } = await admin.storage
      .from("employee-documents")
      .createSignedUrl(offer.storagePath, 3600);

    if (error || !signed?.signedUrl) {
      return { success: false, message: "Could not open offer letter" };
    }

    return { success: true, url: signed.signedUrl, fileName: offer.fileName };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not open offer letter",
    };
  }
}

export async function downloadCandidateOfferLetterAction(): Promise<
  { success: true; base64: string; fileName: string; contentType: string } | { success: false; message: string }
> {
  try {
    const caseId = await getCandidateCaseIdFromSession();
    if (!caseId) return { success: false, message: "Session expired" };

    const admin = createAdminClient();
    const { data: caseRow } = await admin
      .schema("hrms")
      .from("onboarding_cases")
      .select("organization_id, offer_reference_number, personal_email")
      .eq("id", caseId)
      .maybeSingle();

    if (!caseRow) return { success: false, message: "Case not found" };

    const file = await getCandidateOfferLetterFile(
      caseRow.organization_id as string,
      (caseRow.offer_reference_number as string | null) ?? null,
      caseRow.personal_email as string,
    );

    if (!file) return { success: false, message: "Offer letter is not available yet" };

    const base64 = Buffer.from(file.fileBytes).toString("base64");
    return {
      success: true,
      base64,
      fileName: file.fileName,
      contentType: file.contentType,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not download offer letter",
    };
  }
}
