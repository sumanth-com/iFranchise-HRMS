/** Allowed calendar years for every year dropdown / filter in the HRMS. */
export const HRMS_YEAR_MIN = 2025;
export const HRMS_YEAR_MAX = 2029;

export const HRMS_YEARS = [2025, 2026, 2027, 2028, 2029] as const;

export type HrmsYearOption = {
  value: string;
  label: string;
};

export function getHrmsYears(): number[] {
  return [...HRMS_YEARS];
}

export function clampHrmsYear(year: number, fallback = HRMS_YEAR_MIN): number {
  if (!Number.isFinite(year)) return fallback;
  return Math.min(HRMS_YEAR_MAX, Math.max(HRMS_YEAR_MIN, Math.trunc(year)));
}

export function getDefaultHrmsYear(now = new Date()): number {
  return clampHrmsYear(now.getFullYear());
}

export function getHrmsYearSelectItems(options?: {
  includeAll?: boolean;
  allLabel?: string;
}): HrmsYearOption[] {
  const years = getHrmsYears().map((year) => ({
    value: String(year),
    label: String(year),
  }));
  if (options?.includeAll) {
    return [{ value: "all", label: options.allLabel ?? "All years" }, ...years];
  }
  return years;
}

export function isHrmsYear(year: number): boolean {
  return year >= HRMS_YEAR_MIN && year <= HRMS_YEAR_MAX;
}
