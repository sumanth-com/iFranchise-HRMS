import { ZodError } from "zod";

export function onboardingActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    if (first?.message && first.message !== "Invalid input") return first.message;
    return fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
