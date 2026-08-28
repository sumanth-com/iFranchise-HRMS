import "server-only";

import type { AuthErrorCode } from "@/types/auth";
import { getPasswordResetRedirectTo } from "@/lib/auth/reset-redirect";
import { findEligiblePasswordResetTarget } from "@/lib/auth/login-email";
import { getAuthErrorMessage, mapSupabaseAuthError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";

type PasswordResetSendResult =
  | { ok: true }
  | { ok: false; errorCode: AuthErrorCode; message: string };

/**
 * Sends a Supabase recovery email for eligible HRMS portal accounts.
 * Uses the service-role admin client so delivery does not depend on browser auth.
 */
export async function sendHrmsPasswordResetEmail(
  emailInput: string,
): Promise<PasswordResetSendResult> {
  const authEmail = await findEligiblePasswordResetTarget(emailInput);
  if (!authEmail) {
    // Uniform response for unknown/ineligible addresses — no email is sent.
    return { ok: true };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(authEmail, {
    redirectTo: getPasswordResetRedirectTo(),
  });

  if (error) {
    const errorCode = mapSupabaseAuthError(error.message);
    console.error("[password-reset] resetPasswordForEmail failed", {
      authEmail,
      code: errorCode,
      message: error.message,
    });
    return {
      ok: false,
      errorCode,
      message: getAuthErrorMessage(errorCode),
    };
  }

  return { ok: true };
}
