export const AUTH_ROUTES = {
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  callback: "/auth/callback",
  unauthorized: "/403",
  dashboard: "/dashboard",
} as const;

/** Base path for the Universal Email Approval Engine landing page. */
export const APPROVAL_PUBLIC_ROUTE = "/approval";

/** Pre-login marketing / welcome experience */
export const PUBLIC_LANDING_ROUTE = "/";
export const WHATS_NEW_ROUTE = "/whats-new";

export const PUBLIC_ROUTES = [
  PUBLIC_LANDING_ROUTE,
  WHATS_NEW_ROUTE,
  "/terms",
  "/privacy",
  "/cookies",
  "/security",
  AUTH_ROUTES.login,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.resetPassword,
  AUTH_ROUTES.callback,
  APPROVAL_PUBLIC_ROUTE,
  "/api/cron",
  "/api/v1",
  "/e",
  "/verify/payslip",
  "/onboarding",
] as const;

export const LOGOUT_BROADCAST_KEY = "ifranchise-hrms-logout";

/** Cross-tab idle activity sync (client localStorage) */
export const IDLE_ACTIVITY_STORAGE_KEY = "ifranchise-hrms-last-activity";

/** Cross-tab idle logout broadcast */
export const IDLE_LOGOUT_BROADCAST_KEY = "ifranchise-hrms-idle-logout";

/** Remember-me email only — never store passwords here */
export const REMEMBERED_EMAIL_STORAGE_KEY = "ifranchise-hrms-remembered-email";

/** HttpOnly cookie tracking last meaningful activity (server-enforced idle timeout) */
export const IDLE_ACTIVITY_COOKIE = "hrms_last_activity";

/** 2 hours of inactivity before silent session expiration */
export const IDLE_SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

/** 30 days when "Remember me" is checked */
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

/** Default session cookie max-age (7 days) */
export const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
