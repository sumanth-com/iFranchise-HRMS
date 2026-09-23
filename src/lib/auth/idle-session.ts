import {
  DEFAULT_SESSION_MAX_AGE,
  IDLE_ACTIVITY_COOKIE,
  IDLE_ACTIVITY_COOKIE_REFRESH_MS,
  IDLE_SESSION_TIMEOUT_MS,
  REMEMBER_ME_MAX_AGE,
} from "@/lib/auth/constants";

export function getIdleElapsedMs(lastActivityMs: number, now = Date.now()): number {
  return now - lastActivityMs;
}

export function isIdleSessionExpired(
  lastActivityMs: number,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(lastActivityMs) || lastActivityMs <= 0) {
    return false;
  }
  return getIdleElapsedMs(lastActivityMs, now) >= IDLE_SESSION_TIMEOUT_MS;
}

export function parseActivityTimestamp(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function resolveActivityCookieMaxAge(rememberMe: boolean): number {
  return rememberMe ? REMEMBER_ME_MAX_AGE : DEFAULT_SESSION_MAX_AGE;
}

/**
 * True when middleware/server should rewrite `hrms_last_activity`.
 * Prefetches never write. Real navigations write at most once per refresh window
 * so soft-nav does not invalidate the Next.js client router cache.
 */
export function shouldRefreshActivityInMiddleware(request: {
  method: string;
  pathname: string;
  headers: Headers;
  lastActivityMs?: number | null;
  now?: number;
}): boolean {
  if (request.pathname.startsWith("/api/cron")) return false;
  if (request.headers.get("Next-Router-Prefetch") === "1") return false;
  if (request.headers.get("Purpose") === "prefetch") return false;
  if (request.headers.get("Sec-Purpose") === "prefetch") return false;

  const lastActivityMs = request.lastActivityMs;
  if (lastActivityMs == null) return true;

  const now = request.now ?? Date.now();
  return now - lastActivityMs >= IDLE_ACTIVITY_COOKIE_REFRESH_MS;
}

export function shouldRewriteIdleActivityCookie(
  lastActivityMs: number | null,
  now = Date.now(),
): boolean {
  if (lastActivityMs == null) return true;
  return now - lastActivityMs >= IDLE_ACTIVITY_COOKIE_REFRESH_MS;
}

export { IDLE_ACTIVITY_COOKIE, IDLE_SESSION_TIMEOUT_MS, IDLE_ACTIVITY_COOKIE_REFRESH_MS };
