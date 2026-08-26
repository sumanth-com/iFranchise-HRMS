import type { NextRequest, NextResponse } from "next/server";

import { signPayload, verifySignedPayload } from "@/lib/security/hmac";

const COOKIE_NAME = "hrms_permissions";
const TTL_SECONDS = 5 * 60;

type PermissionCachePayload = {
  userId: string;
  codes: string[];
  roleCodes: string[];
  accountAllowed: boolean;
  expiresAt: number;
};

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

export async function getCachedPermissionCodes(
  request: NextRequest,
  userId: string,
): Promise<string[] | null> {
  const payload = await getCachedPermissionPayload(request, userId);
  return payload?.codes ?? null;
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

export async function getCachedPermissionPayload(
  request: NextRequest,
  userId: string,
): Promise<PermissionCachePayload | null> {
  try {
    const value = request.cookies.get(COOKIE_NAME)?.value;
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
 * Fail-closed: missing, invalid, expired, wrong user, or empty codes → null
 * (caller must resolve permissions via DB/RPC).
 */
export async function getVerifiedPermissionCodesForUser(
  userId: string,
): Promise<string[] | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIE_NAME)?.value;
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
    const payload: PermissionCachePayload = {
      userId,
      codes,
      roleCodes,
      accountAllowed,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    };

    response.cookies.set(COOKIE_NAME, await serializeSignedPayload(payload), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TTL_SECONDS,
    });
  } catch (error) {
    console.error("[permission-cache] attach failed", error);
  }
}

export function clearPermissionCache(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
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
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const payload: PermissionCachePayload = {
      userId,
      codes,
      roleCodes,
      accountAllowed,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    };
    cookieStore.set(COOKIE_NAME, await serializeSignedPayload(payload), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TTL_SECONDS,
    });
  } catch (error) {
    console.error("[permission-cache] set cookie failed", error);
  }
}

export async function clearPermissionCacheCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export const PERMISSION_CACHE_COOKIE_NAME = COOKIE_NAME;
