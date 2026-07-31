import "server-only";

import { hmacSha256Hex } from "@/lib/security/hmac-utils";
import {
  getEmailVerificationTokenSecret,
  getResetPasswordTokenSecret,
} from "@/lib/security/token-secrets";

/** Signs password-reset workflow identifiers (rate limits, audit correlation). */
export function hashPasswordResetToken(raw: string): string {
  return hmacSha256Hex(getResetPasswordTokenSecret(), `pwd-reset:v1:${raw}`);
}

/** Signs email verification payloads (OTP codes, verification links). */
export function hashEmailVerificationToken(raw: string): string {
  return hmacSha256Hex(getEmailVerificationTokenSecret(), `email-verify:v1:${raw}`);
}
