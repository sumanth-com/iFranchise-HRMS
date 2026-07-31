import { cookies } from "next/headers";

import {
  ONBOARDING_SESSION_COOKIE,
  ONBOARDING_SESSION_TTL_DAYS,
} from "@/lib/onboarding/constants";
import { validatePortalSession } from "@/lib/onboarding/onboarding-security";

export async function getCandidateCaseIdFromSession(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(ONBOARDING_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return validatePortalSession(raw);
}

export async function setCandidateSession(rawSession: string) {
  const store = await cookies();
  store.set(ONBOARDING_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/onboarding",
    maxAge: ONBOARDING_SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearCandidateSession() {
  const store = await cookies();
  store.delete(ONBOARDING_SESSION_COOKIE);
}
