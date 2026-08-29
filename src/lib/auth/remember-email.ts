"use client";

import { REMEMBERED_EMAIL_STORAGE_KEY } from "@/lib/auth/constants";

/** Former system-account email; migrate remembered login only (not used for auth). */
const LEGACY_SYSTEM_LOGIN_EMAIL = "sumanth.reddy@ifranchise.in";
const CURRENT_SYSTEM_LOGIN_EMAIL = "it@ifranchise.in";

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY)?.trim() ?? "";
    if (stored.toLowerCase() === LEGACY_SYSTEM_LOGIN_EMAIL) {
      window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, CURRENT_SYSTEM_LOGIN_EMAIL);
      return CURRENT_SYSTEM_LOGIN_EMAIL;
    }
    return stored;
  } catch {
    return "";
  }
}

export function setRememberedEmail(email: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email.trim());
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

export function clearRememberedEmail(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}
