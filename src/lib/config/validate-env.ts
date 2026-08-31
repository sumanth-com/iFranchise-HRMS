import "server-only";

import { REQUIRED_PRODUCTION_SECRET_ENV_KEYS } from "@/lib/security/token-secrets";

const REQUIRED_PRODUCTION_ENV = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function isNonEmpty(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function formatMissingList(keys: string[]): string {
  return keys.map((key) => `  • ${key}`).join("\n");
}

/**
 * Validates server environment variables in production.
 * Called from instrumentation on Node.js server startup.
 */
export function validateServerEnvironment(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missingSecrets = REQUIRED_PRODUCTION_SECRET_ENV_KEYS.filter(
    (key) => !isNonEmpty(process.env[key]),
  );
  const missingCore = REQUIRED_PRODUCTION_ENV.filter(
    (key) => !isNonEmpty(process.env[key]),
  );

  const sections: string[] = [];

  if (missingSecrets.length > 0) {
    sections.push(
      `Missing server signing secrets:\n${formatMissingList(missingSecrets)}\n` +
        "Generate values locally: npm run generate:secrets",
    );
  }

  if (missingCore.length > 0) {
    sections.push(`Missing core configuration:\n${formatMissingList(missingCore)}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (
    appUrl &&
    (appUrl.includes("vercel.app") || appUrl.includes("localhost"))
  ) {
    console.warn(
      "[env] NEXT_PUBLIC_APP_URL should be https://hrms.ifranchise.in in production.",
    );
  }

  if (sections.length > 0) {
    throw new Error(
      [
        "iFranchise HRMS cannot start — production environment is incomplete.",
        "",
        ...sections,
        "",
        "Add variables in Vercel: Project → Settings → Environment Variables → Production.",
        "Never commit secrets to git — use .env.local locally only.",
      ].join("\n"),
    );
  }
}
