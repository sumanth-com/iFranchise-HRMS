/**
 * Canonical browser-facing origin for the HRMS application.
 * All invite, recovery, and approval links must use this helper — never hardcode hosts.
 */
export const PRODUCTION_CANONICAL_APP_URL = "https://hrms.ifranchise.in";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isUnsafeProductionOrigin(origin: string): boolean {
  const lower = origin.toLowerCase();
  return (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("vercel.app")
  );
}

/**
 * Resolves the public app origin used in emails, auth redirects, and absolute links.
 * In production, falls back to the canonical domain when env is missing or misconfigured.
 */
export function resolveAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (isProduction) {
    if (!configured || isUnsafeProductionOrigin(configured)) {
      if (configured) {
        console.warn(
          "[app-origin] NEXT_PUBLIC_APP_URL is not production-safe; using canonical URL.",
        );
      }
      return PRODUCTION_CANONICAL_APP_URL;
    }
    return trimTrailingSlash(configured);
  }

  return trimTrailingSlash(configured ?? "http://localhost:3000");
}

/** Builds an absolute URL for a same-origin path (must start with `/`). */
export function absoluteAppUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveAppOrigin()}${normalizedPath}`;
}
