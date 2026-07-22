import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "hrms_permissions";
const TTL_SECONDS = 5 * 60;

type PermissionCachePayload = {
  userId: string;
  codes: string[];
  expiresAt: number;
};

export function getCachedPermissionCodes(
  request: NextRequest,
  userId: string,
): string[] | null {
  const value = request.cookies.get(COOKIE_NAME)?.value;
  if (!value) return null;

  try {
    const payload = JSON.parse(value) as PermissionCachePayload;
    if (payload.userId !== userId) return null;
    if (payload.expiresAt <= Date.now()) return null;
    return payload.codes;
  } catch {
    return null;
  }
}

export function attachPermissionCache(
  response: NextResponse,
  userId: string,
  codes: string[],
): void {
  const payload: PermissionCachePayload = {
    userId,
    codes,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  };

  response.cookies.set(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function clearPermissionCache(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}
