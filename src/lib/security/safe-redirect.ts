/**
 * Allow only same-origin relative paths for post-auth redirects.
 */
export function getSafeRedirectPath(next: string | null | undefined, fallback: string): string {
  const value = (next ?? fallback).trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  return value;
}
