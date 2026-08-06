import { format, isValid, parseISO } from "date-fns";

/** Formats an ISO date string without throwing on invalid values. */
export function formatDocumentDate(
  value: string | null | undefined,
  pattern: string,
  fallback = "—",
): string {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, pattern) : fallback;
}
