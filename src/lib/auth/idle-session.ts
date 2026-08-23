import {
  DEFAULT_SESSION_MAX_AGE,
  IDLE_ACTIVITY_COOKIE,
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

export function shouldRefreshActivityInMiddleware(request: {
  method: string;
  pathname: string;
  headers: Headers;
}): boolean {
  if (request.method !== "GET") return false;
  if (request.pathname.startsWith("/api/")) return false;
  if (request.headers.get("Next-Router-Prefetch") === "1") return false;
  if (request.headers.get("Purpose") === "prefetch") return false;
  return true;
}

export { IDLE_ACTIVITY_COOKIE, IDLE_SESSION_TIMEOUT_MS };
