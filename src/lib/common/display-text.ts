const UUID_IN_TEXT_RE =
  /[`'"([]?\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b[`'")]?/gi;

/** Remove UUIDs and leftover empty brackets from user-facing text. */
export function stripIdsFromText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(UUID_IN_TEXT_RE, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s\-–—·|:]+|[\s\-–—·|:]+$/g, "")
    .trim();
}

export function humanizeActivityDescription(
  description: string | null | undefined,
  fallback = "System activity",
): string {
  return stripIdsFromText(description) || fallback;
}
