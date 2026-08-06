export function onboardingPortalErrorMessage(
  error: unknown,
  fallback = "We could not complete account setup. Please try again or contact HR for assistance.",
): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const raw = error.message.trim();
  const msg = raw.toLowerCase();

  if (
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("user already")
  ) {
    return "This email is already registered. Use Sign in below with your password. If you never finished setup, contact HR for a new invitation link.";
  }

  if (msg.includes("auth_user_id") && (msg.includes("schema cache") || msg.includes("column"))) {
    return "Account setup is finishing on our side. Please wait a minute and try again, or contact HR if the issue persists.";
  }

  if (msg.includes("password") && msg.includes("weak")) {
    return "Choose a stronger password with at least 8 characters.";
  }

  if (raw.length > 0 && raw.length < 200 && !msg.includes("pgrst") && !msg.includes("postgres")) {
    return raw;
  }

  return fallback;
}
