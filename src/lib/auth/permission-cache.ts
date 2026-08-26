import type { NextRequest, NextResponse } from "next/server";

import { signPayload, verifySignedPayload } from "@/lib/security/hmac";

/**
 * Permission cache cookie (HMAC-signed, user-bound, fail-closed).
 *
 * Design (chunked, security-preserving):
 * - Canonical body is JSON: { userId, codes, roleCodes, accountAllowed, expiresAt }
 * - Signature = HMAC-SHA256(body) over the FULL body (never per-chunk alone)
 * - Cookie value = `${sig}.${body}` when small enough for one cookie
 * - When over MAX_CHUNK_BYTES, split into `hrms_permissions`, `hrms_permissions.1`, …
 *   (same pattern as @supabase/ssr auth cookies). Reassemble → verify HMAC →
 *   then userId / expiry / non-empty codes checks.
 * - Missing/partial chunks, bad HMAC, wrong user, expired, or empty codes → null
 *   (caller must resolve via RPC — fail-closed).
 * - Never truncates permission codes; never shares unsigned caches across users.
 */

const COOKIE_NAME = "hrms_permissions";
const TTL_SECONDS = 5 * 60;
/** Stay under Chromium's 4096 name+value limit with headroom for cookie name + attributes. */
const MAX_CHUNK_BYTES = 3000;
const MAX_CHUNKS = 8;

type PermissionCachePayload = {
  userId: string;
  codes: string[];
  roleCodes: string[];
  accountAllowed: boolean;
  expiresAt: number;
};

type CookieWriter = {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    },
  ) => void;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function chunkCookieName(index: number): string {
  return index === 0 ? COOKIE_NAME : `${COOKIE_NAME}.${index}`;
}

function splitIntoChunks(value: string, maxBytes: number): string[] {
  if (value.length <= maxBytes) return [value];
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += maxBytes) {
    chunks.push(value.slice(offset, offset + maxBytes));
  }
  return chunks;
}

async function serializeSignedPayload(payload: PermissionCachePayload): Promise<string> {
  const body = JSON.stringify(payload);
  return `${await signPayload(body)}.${body}`;
}

async function parseSignedPayload(value: string): Promise<PermissionCachePayload | null> {
  const separator = value.indexOf(".");
  if (separator <= 0) return null;

  const signature = value.slice(0, separator);
  const body = value.slice(separator + 1);
  if (!(await verifySignedPayload(body, signature))) return null;

  try {
    return JSON.parse(body) as PermissionCachePayload;
  } catch {
    return null;
  }
}

function isUsablePermissionPayload(
  payload: PermissionCachePayload | null,
  userId: string,
): payload is PermissionCachePayload {
  if (!payload) return false;
  if (payload.userId !== userId) return false;
  if (payload.expiresAt <= Date.now()) return false;
  if (!Array.isArray(payload.codes) || payload.codes.length === 0) return false;
  return true;
}

function readCookieValue(
  getCookie: (name: string) => string | undefined,
): string | null {
  const first = getCookie(COOKIE_NAME);
  if (!first) return null;

  // Legacy single-cookie OR first chunk of a chunked payload.
  const parts = [first];
  for (let index = 1; index < MAX_CHUNKS; index += 1) {
    const next = getCookie(chunkCookieName(index));
    if (!next) break;
    parts.push(next);
  }
  return parts.join("");
}

function writeChunkedCookie(writer: CookieWriter, signedValue: string, maxAge: number): void {
  const chunks = splitIntoChunks(signedValue, MAX_CHUNK_BYTES);
  if (chunks.length > MAX_CHUNKS) {
    // Fail-closed: do not write a truncated permission set.
    console.error("[permission-cache] payload exceeds max chunks; skip attach (fail-closed)", {
      chunks: chunks.length,
      bytes: signedValue.length,
    });
    clearChunkedCookies(writer);
    return;
  }

  const options = cookieOptions(maxAge);
  chunks.forEach((chunk, index) => {
    writer.set(chunkCookieName(index), chunk, options);
  });
  // Clear any leftover higher-index chunks from a previous larger payload.
  for (let index = chunks.length; index < MAX_CHUNKS; index += 1) {
    writer.set(chunkCookieName(index), "", { ...options, maxAge: 0 });
  }
}

function clearChunkedCookies(writer: CookieWriter): void {
  const options = cookieOptions(0);
  for (let index = 0; index < MAX_CHUNKS; index += 1) {
    writer.set(chunkCookieName(index), "", options);
  }
}

export async function getCachedPermissionCodes(
  request: NextRequest,
  userId: string,
): Promise<string[] | null> {
  const payload = await getCachedPermissionPayload(request, userId);
  return payload?.codes ?? null;
}

export async function getCachedPermissionPayload(
  request: NextRequest,
  userId: string,
): Promise<PermissionCachePayload | null> {
  try {
    const value = readCookieValue((name) => request.cookies.get(name)?.value);
    if (!value) return null;

    const payload = await parseSignedPayload(value);
    if (!isUsablePermissionPayload(payload, userId)) return null;
    return payload;
  } catch (error) {
    console.error("[permission-cache] read failed", error);
    return null;
  }
}

/**
 * RSC/server-action reader for the HMAC-signed permission cookie.
 * Fail-closed: missing, invalid, expired, wrong user, empty codes, or incomplete
 * chunks → null (caller must resolve permissions via DB/RPC).
 */
export async function getVerifiedPermissionCodesForUser(
  userId: string,
): Promise<string[] | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const value = readCookieValue((name) => cookieStore.get(name)?.value);
    if (!value) return null;

    const payload = await parseSignedPayload(value);
    if (!isUsablePermissionPayload(payload, userId)) return null;
    return payload.codes;
  } catch (error) {
    console.error("[permission-cache] RSC read failed", error);
    return null;
  }
}

export async function attachPermissionCache(
  response: NextResponse,
  userId: string,
  codes: string[],
  accountAllowed = true,
  roleCodes: string[] = [],
): Promise<void> {
  try {
    if (!Array.isArray(codes) || codes.length === 0) {
      clearPermissionCache(response);
      return;
    }

    const payload: PermissionCachePayload = {
      userId,
      codes,
      roleCodes,
      accountAllowed,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    };

    const signed = await serializeSignedPayload(payload);
    writeChunkedCookie(
      {
        set: (name, value, options) => {
          response.cookies.set(name, value, options);
        },
      },
      signed,
      TTL_SECONDS,
    );

    if (process.env.NODE_ENV === "development") {
      console.info("[perf]", {
        area: "navigation",
        label: "permission-cookie-attach",
        codes: codes.length,
        bytes: signed.length,
        chunks: Math.ceil(signed.length / MAX_CHUNK_BYTES),
      });
    }
  } catch (error) {
    console.error("[permission-cache] attach failed", error);
  }
}

export function clearPermissionCache(response: NextResponse): void {
  clearChunkedCookies({
    set: (name, value, options) => {
      response.cookies.set(name, value, options);
    },
  });
}

/** Set the signed permission cookie from a Server Action (login) so middleware can skip bootstrap RPCs. */
export async function setPermissionCacheCookie(
  userId: string,
  codes: string[],
  accountAllowed = true,
  roleCodes: string[] = [],
): Promise<void> {
  try {
    if (!Array.isArray(codes) || codes.length === 0) {
      await clearPermissionCacheCookie();
      return;
    }

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const payload: PermissionCachePayload = {
      userId,
      codes,
      roleCodes,
      accountAllowed,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    };
    const signed = await serializeSignedPayload(payload);
    writeChunkedCookie(
      {
        set: (name, value, options) => {
          cookieStore.set(name, value, options);
        },
      },
      signed,
      TTL_SECONDS,
    );
  } catch (error) {
    console.error("[permission-cache] set cookie failed", error);
  }
}

export async function clearPermissionCacheCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  clearChunkedCookies({
    set: (name, value, options) => {
      cookieStore.set(name, value, options);
    },
  });
}

export const PERMISSION_CACHE_COOKIE_NAME = COOKIE_NAME;
