import type { AuthErrorCode } from "@/types/auth";

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
  EMPLOYEE_NOT_FOUND:
    "No employee record is linked to this account. Contact your HR administrator.",
  EMPLOYEE_INACTIVE:
    "Your employee account is not active. Contact your HR administrator.",
  EMPLOYEE_DELETED:
    "This employee record is no longer available. Contact your HR administrator.",
  NO_ROLES:
    "No roles are assigned to your account. Contact your HR administrator.",
  ORGANIZATION_NOT_FOUND:
    "Your organization could not be loaded. Contact your HR administrator.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  NETWORK_ERROR:
    "Unable to reach the server. Check your connection and try again.",
  EMAIL_NOT_CONFIRMED:
    "Your email is not confirmed yet. Check your inbox or ask HR to resend the invitation.",
  EMAIL_LOGIN_DISABLED:
    "Email sign-in is disabled for this workspace. Contact your administrator to enable email authentication.",
  RATE_LIMITED:
    "Too many sign-in attempts. Please wait a few minutes and try again.",
  CONFIG_ERROR:
    "Authentication is not configured correctly. Contact your administrator.",
  SERVER_ERROR: "An unexpected error occurred. Please try again later.",
  VALIDATION_ERROR: "Please check the form and try again.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  RESET_LINK_INVALID:
    "This password reset link is invalid or has expired. Request a new one.",
};

export function getAuthErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code];
}

export function mapSupabaseAuthError(message: string): AuthErrorCode {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("wrong password") ||
    normalized.includes("user not found")
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
    normalized.includes("network") ||
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch")
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

  return "SERVER_ERROR";
}
