/**
 * Pure GPS display helpers — kept free of server/client side-effects so
 * location UI never fails to import formatters at runtime.
 */

/** Format stored GPS for display without truncating meaningful digits. */
export function formatGpsCoordinate(value: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  // GPS in this app is stored to ~6–8 decimal places; keep significant digits.
  const asFixed = value.toFixed(8);
  const trimmed = asFixed.replace(/0+$/, "").replace(/\.$/, "");
  const [, fraction = ""] = trimmed.split(".");
  if (fraction.length >= 6) return trimmed;
  if (!trimmed.includes(".")) return value.toFixed(6);
  return value.toFixed(6);
}
