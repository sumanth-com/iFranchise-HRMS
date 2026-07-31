import "server-only";

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]$/,
  /^\[fc00:/i,
  /^\[fd/i,
];

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "::1") return true;
  return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Returns true when a remote URL is safe for server-side fetch (HTTPS only, no private IPs).
 */
export function isSafeRemoteFetchUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    if (isBlockedHostname(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
