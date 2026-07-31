import { randomBytes } from "node:crypto";

/** Cryptographically secure random secret for HMAC / token signing (base64url). */
export function generateSecureSecret(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}
