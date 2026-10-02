import { parseISO } from "date-fns";

/** Calendar month of service (1 = joining month, 2 = the next calendar month). */
export function resolveEmploymentServiceMonth(
  joiningDate: string | null | undefined,
  asOfDate: string,
): number | null {
  if (!joiningDate) return null;
  const join = parseISO(joiningDate.slice(0, 10));
  const asOf = parseISO(asOfDate.slice(0, 10));
  if (Number.isNaN(join.getTime()) || Number.isNaN(asOf.getTime())) return null;
  if (asOf < join) return null;
  const months =
    (asOf.getFullYear() - join.getFullYear()) * 12 + (asOf.getMonth() - join.getMonth()) + 1;
  return Math.max(1, months);
}
