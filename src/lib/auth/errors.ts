import type { AuthErrorCode } from "@/types/auth";

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS:
    "The email or password is incorrect. Please check your details and try again.",
  EMPLOYEE_NOT_FOUND:
    "Your account is not active yet. Please contact HR if you need assistance.",
  EMPLOYEE_INACTIVE:
    "Your account is currently inactive. Please contact HR for assistance.",
  EMPLOYEE_DELETED:
    "Your account is currently inactive. Please contact HR for assistance.",
  PORTAL_ACCESS_DENIED:
    "Your account does not currently have access to this portal.",
  TABLET_ACCESS_DENIED:
    "Tablet access is not enabled for Employee Self-Service. Sign in on a desktop computer, or ask HR to enable tablet access.",
  NO_ROLES:
    "Your account does not currently have access to this portal.",
  ORGANIZATION_NOT_FOUND:
    "We couldn't complete your sign-in right now. Please try again.",
  PROFILE_LOOKUP_FAILED:
    "We couldn't complete your sign-in right now. Please try again.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  NETWORK_ERROR: "We couldn't complete your sign-in right now. Please try again.",
  EMAIL_NOT_CONFIRMED:
    "Your account is not active yet. Please contact HR if you need assistance.",
  EMAIL_LOGIN_DISABLED:
    "Sign-in is temporarily unavailable. Please contact HR for assistance.",
  RATE_LIMITED:
    "Too many sign-in attempts. Please wait a moment and try again.",
  CONFIG_ERROR:
    "Sign-in is temporarily unavailable. Please contact HR for assistance.",
  SERVER_ERROR: "We couldn't complete your sign-in right now. Please try again.",
  VALIDATION_ERROR: "Please check the form and try again.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  RESET_LINK_INVALID:
    "This password reset link is invalid or has expired. Request a new one.",
};

const AUTH_ERROR_CODE_SET = new Set<string>(Object.keys(AUTH_ERROR_MESSAGES));

const KNOWN_USER_MESSAGES = new Set(Object.values(AUTH_ERROR_MESSAGES));

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === "string" && AUTH_ERROR_CODE_SET.has(value);
}

export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code];
}

/** True when a string looks like a technical/raw failure, not HRMS copy. */
export function looksLikeTechnicalAuthError(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  if (!normalized) return true;
  if (normalized === "undefined" || normalized === "null" || normalized === "{}") {
    return true;
  }

  return (
    normalized.includes("supabase") ||
    normalized.includes("postgres") ||
    normalized.includes("postgrest") ||
    normalized.includes("pgrst") ||
    normalized.includes("authapi") ||
    normalized.includes("auth api") ||
    normalized.includes("jwt") ||
    normalized.includes("stack") ||
    normalized.includes("exception") ||
    normalized.includes("internal server") ||
    normalized.includes("database") ||
    normalized.includes("sql") ||
    normalized.includes("schema cache") ||
    normalized.includes("fetch failed") ||
    normalized.includes("econn") ||
    /\bstatus(code)?[=\s:]?\d{3}\b/.test(normalized) ||
    /^[a-z_]+error:/.test(normalized) ||
    /error code/.test(normalized)
  );
}

/**
 * Always returns short, human-readable HRMS copy for auth UI.
 * Prefer typed AuthErrorCode; sanitize any free-form message.
 */
export function resolveUserFacingAuthMessage(
  codeOrMessage?: AuthErrorCode | string | null,
  fallback: AuthErrorCode = "NETWORK_ERROR",
): string {
  if (isAuthErrorCode(codeOrMessage)) {
    return getAuthErrorMessage(codeOrMessage);
  }

  if (typeof codeOrMessage === "string") {
    const trimmed = codeOrMessage.trim();
    if (!trimmed || looksLikeTechnicalAuthError(trimmed)) {
      return getAuthErrorMessage(fallback);
    }
    if (KNOWN_USER_MESSAGES.has(trimmed)) {
      return trimmed;
    }
    // Allow short, already-human validation copy (e.g. Zod field messages).
    if (trimmed.length <= 160 && !/[<>{}]/.test(trimmed)) {
      return trimmed;
    }
  }

  return getAuthErrorMessage(fallback);
}

/** Safe diagnostic string for Auth failures (never includes tokens/passwords). */
export function describeAuthFailure(error: unknown): string {
  if (!error || typeof error !== "object") {
    return typeof error === "string" ? error : "";
  }

  const record = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    name?: unknown;
    statusCode?: unknown;
  };

  const parts: string[] = [];
  if (typeof record.name === "string" && record.name) parts.push(record.name);
  if (typeof record.code === "string" && record.code) parts.push(record.code);
  if (typeof record.status === "number") parts.push(`status=${record.status}`);
  if (typeof record.statusCode === "number") {
    parts.push(`statusCode=${record.statusCode}`);
  }
  if (typeof record.message === "string" && record.message.trim()) {
    parts.push(record.message.trim());
  } else if (record.message != null) {
    parts.push(String(record.message));
  }

  return parts.join(" | ");
}

export function mapSupabaseAuthError(message: string): AuthErrorCode {
  const normalized = message.toLowerCase().trim();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("wrong password") ||
    normalized.includes("user not found") ||
    normalized.includes("invalid_grant") ||
    normalized.includes("email not found")
  ) {
    return "INVALID_CREDENTIALS";
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("email address not confirmed")
  ) {
    return "EMAIL_NOT_CONFIRMED";
  }

  if (
    normalized.includes("too many requests") ||
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit")
  ) {
    return "RATE_LIMITED";
  }

  if (
    !normalized ||
    normalized === "{}" ||
    normalized.includes("network") ||
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("auth_timeout") ||
    normalized.includes("aborted") ||
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("upstream request timeout") ||
    normalized.includes("504") ||
    normalized.includes("503") ||
    normalized.includes("502") ||
    normalized.includes("schema cache") ||
    normalized.includes("cloudflare")
  ) {
    return "NETWORK_ERROR";
  }

  if (
    normalized.includes("session") &&
    (normalized.includes("expired") || normalized.includes("invalid"))
  ) {
    return "SESSION_EXPIRED";
  }

  if (
    normalized.includes("api key") ||
    normalized.includes("invalid jwt") ||
    normalized.includes("bad_jwt")
  ) {
    return "CONFIG_ERROR";
  }

  if (
    normalized.includes("email logins are disabled") ||
    normalized.includes("email_provider_disabled") ||
    normalized.includes("email provider is disabled")
  ) {
    return "EMAIL_LOGIN_DISABLED";
  }

  // Prefer a soft network-facing outcome over a technical "unexpected" code.
  return "NETWORK_ERROR";
}
