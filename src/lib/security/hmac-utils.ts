import "server-only";

import { createHmac } from "node:crypto";

/** HMAC-SHA256 hex digest for server-side token signing. */
export function hmacSha256Hex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}
