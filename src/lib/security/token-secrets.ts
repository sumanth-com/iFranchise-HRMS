import "server-only";

/**
 * Server-only signing secrets — loaded exclusively from environment variables.
 * Never hardcode values or fall back to other credentials (e.g. service role key).
 */

export const SERVER_SECRET_ENV_KEYS = {
  onboarding: "ONBOARDING_TOKEN_SECRET",
  approval: "APPROVAL_TOKEN_SECRET",
  resetPassword: "RESET_PASSWORD_TOKEN_SECRET",
  emailVerification: "EMAIL_VERIFICATION_TOKEN_SECRET",
  permissionCache: "PERMISSION_CACHE_SECRET",
  cron: "CRON_SECRET",
} as const;

export type ServerSecretKind = keyof typeof SERVER_SECRET_ENV_KEYS;

/** @deprecated Use SERVER_SECRET_ENV_KEYS */
export const TOKEN_SECRET_ENV_KEYS = SERVER_SECRET_ENV_KEYS;

export const REQUIRED_PRODUCTION_SECRET_ENV_KEYS = Object.values(SERVER_SECRET_ENV_KEYS);

const SECRET_LABELS: Record<ServerSecretKind, string> = {
  onboarding: "onboarding invitation links",
  approval: "email approval tokens",
  resetPassword: "password reset workflow",
  emailVerification: "email verification codes",
  permissionCache: "signed permission cache cookies",
  cron: "secured cron endpoints",
};

function readSecret(kind: ServerSecretKind): string {
  const envKey = SERVER_SECRET_ENV_KEYS[kind];
  const value = process.env[envKey]?.trim();
  if (!value) {
    throw new Error(
      `${envKey} is not configured (required for ${SECRET_LABELS[kind]}). ` +
        "Run npm run generate:secrets and add the value to your environment.",
    );
  }
  return value;
}

export function getOnboardingTokenSecret(): string {
  return readSecret("onboarding");
}

export function getApprovalTokenSecret(): string {
  return readSecret("approval");
}

export function getResetPasswordTokenSecret(): string {
  return readSecret("resetPassword");
}

export function getEmailVerificationTokenSecret(): string {
  return readSecret("emailVerification");
}

export function getPermissionCacheSecret(): string {
  return readSecret("permissionCache");
}

export function getCronSecret(): string {
  return readSecret("cron");
}
