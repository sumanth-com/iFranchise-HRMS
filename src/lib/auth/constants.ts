export const AUTH_ROUTES = {
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  callback: "/auth/callback",
  unauthorized: "/403",
  dashboard: "/",
} as const;

/** Base path for the Universal Email Approval Engine landing page. */
export const APPROVAL_PUBLIC_ROUTE = "/approval";

export const PUBLIC_ROUTES = [
  AUTH_ROUTES.login,
  AUTH_ROUTES.forgotPassword,
  AUTH_ROUTES.resetPassword,
  AUTH_ROUTES.callback,
  APPROVAL_PUBLIC_ROUTE,
] as const;

export const LOGOUT_BROADCAST_KEY = "ifranchise-hrms-logout";

/** 30 days when "Remember me" is checked */
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

/** Default session cookie max-age (7 days) */
export const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
