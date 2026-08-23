"use client";

import { AUTH_ROUTES } from "@/lib/auth/constants";

export const LANDING_TO_LOGIN_KEY = "hrms-landing-to-login";

export function navigateToLogin() {
  try {
    sessionStorage.setItem(LANDING_TO_LOGIN_KEY, Date.now().toString());
  } catch {
    // Ignore storage failures
  }

  window.location.assign(AUTH_ROUTES.login);
}

export function consumeLandingToLoginTransition(): boolean {
  try {
    const value = sessionStorage.getItem(LANDING_TO_LOGIN_KEY);
    if (!value) return false;
    sessionStorage.removeItem(LANDING_TO_LOGIN_KEY);
    return true;
  } catch {
    return false;
  }
}
