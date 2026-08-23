"use client";

import { REMEMBERED_EMAIL_STORAGE_KEY } from "@/lib/auth/constants";

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY)?.trim() ?? "";
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
