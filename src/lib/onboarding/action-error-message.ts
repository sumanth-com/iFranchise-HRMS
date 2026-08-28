import { ZodError } from "zod";

/**
 * Resolves a safe, user-facing message for an onboarding server action.
 *
 * Zod issue messages are authored in our own schemas, so they are kept as
 * legitimate validation feedback. Everything else may be raw Supabase/PostgREST
 * or transport text, so it is logged for debugging and replaced by the fallback.
 */
export function onboardingActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    if (first?.message && first.message !== "Invalid input") return first.message;
    return fallback;
  }

  console.error("[onboarding] action failed", {
    name: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : String(error),
  });

  return fallback;
}
