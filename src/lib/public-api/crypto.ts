import "server-only";

import { createHash, createHmac, randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";

import { getApprovalTokenSecret } from "@/lib/security/token-secrets";
import { API_KEY_PREFIX } from "@/lib/public-api/constants";

export function hashApiSecret(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const rawKey = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    rawKey,
    prefix: rawKey.slice(0, 14),
    hash: hashApiSecret(rawKey),
  };
}

export function generateWebhookSecret(): {
  rawSecret: string;
  prefix: string;
  hash: string;
  encrypted: string;
} {
  const rawSecret = `whsec_${randomBytes(32).toString("base64url")}`;
  return {
    rawSecret,
    prefix: rawSecret.slice(0, 12),
    hash: hashApiSecret(rawSecret),
    encrypted: encryptSecret(rawSecret),
  };
}

function encryptionKey(): Buffer {
  const secret =
    process.env.WEBHOOK_ENCRYPTION_SECRET?.trim() || getApprovalTokenSecret();
  return scryptSync(secret, "hrms-webhook-secret-v1", 32);
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Invalid encrypted secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(`${timestamp}.${body}`);
  return hmac.digest("hex");
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export function requestIdFrom(request: Request): string {
  const existing = request.headers.get("x-request-id")?.trim();
  if (existing && existing.length <= 128) return existing;
  return crypto.randomUUID();
}
