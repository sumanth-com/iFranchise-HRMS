/**
 * Distinguishes "Supabase answered: this request has no valid session" from
 * "Supabase could not be reached".
 *
 * Only the first kind may ever drop a user to /login. A transient outage must
 * leave the session cookies intact so an authenticated user is not signed out
 * by a network blip. Edge-runtime safe (pure function, no Node APIs).
 */

/** Error names that always mean the auth service was unreachable. */
const TRANSIENT_ERROR_NAMES = new Set([
  "AuthRetryableFetchError",
  "AbortError",
  "TimeoutError",
  "FetchError",
]);

/** Substrings that only appear in transport/gateway failures, never in a valid auth denial. */
const TRANSIENT_MESSAGE_PATTERNS = [
  "fetch failed",
  "failed to fetch",
  "network",
  "enotfound",
  "econnrefused",
  "econnreset",
  "etimedout",
  "epipe",
  "socket hang up",
  "timeout",
  "timed out",
  "aborted",
  "upstream",
  "gateway",
  "service unavailable",
  "temporarily unavailable",
];

/**
 * Thrown when the auth service could not be reached, so the session could be
 * neither confirmed nor denied. Callers must surface a generic retry state —
 * never a redirect to /login, which would look like an unexpected sign-out.
 */
export class AuthServiceUnavailableError extends Error {
  constructor() {
    super("AUTH_SERVICE_UNAVAILABLE");
    this.name = "AuthServiceUnavailableError";
  }
}

export function isTransientAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const record = error as {
    name?: unknown;
    status?: unknown;
    message?: unknown;
  };

  // A missing or invalid session is a definitive answer, never an outage.
  if (record.name === "AuthSessionMissingError") return false;

  if (typeof record.name === "string" && TRANSIENT_ERROR_NAMES.has(record.name)) {
    return true;
  }

  if (typeof record.status === "number") {
    if (record.status >= 500 || record.status === 0 || record.status === 429) {
      return true;
    }
    // 400/401/403 — Supabase reached a decision about this session.
    if (record.status >= 400 && record.status < 500) return false;
  }

  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";
  if (!message) return false;

  return TRANSIENT_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern));
}
