import type { LookupOption } from "@/types/employee";

export const STANDARD_EMPLOYMENT_TYPE_CODES = [
  "FULL_TIME",
  "PROBATION",
  "INTERN",
] as const;

export type StandardEmploymentTypeCode = (typeof STANDARD_EMPLOYMENT_TYPE_CODES)[number];

const INTERN_TYPE_CODES = new Set(["INTERN", "INTERNSHIP", "TRAINEE"]);
const PROBATION_TYPE_CODES = new Set(["PROBATION"]);
const FULL_TIME_TYPE_CODES = new Set(["FULL_TIME"]);

function upper(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

export function normalizeStandardEmploymentTypeCode(
  code: string | null | undefined,
): StandardEmploymentTypeCode | null {
  const normalized = upper(code);
  if (FULL_TIME_TYPE_CODES.has(normalized)) return "FULL_TIME";
  if (PROBATION_TYPE_CODES.has(normalized)) return "PROBATION";
  if (INTERN_TYPE_CODES.has(normalized)) return "INTERN";
  return null;
}

export function isStandardEmploymentTypeCode(code: string | null | undefined): boolean {
  return normalizeStandardEmploymentTypeCode(code) !== null;
}

export function filterStandardEmploymentTypes(types: LookupOption[]): LookupOption[] {
  const byCode = new Map<StandardEmploymentTypeCode, LookupOption>();

  for (const type of types) {
    const standardCode = normalizeStandardEmploymentTypeCode(type.code);
    if (!standardCode || byCode.has(standardCode)) continue;
    byCode.set(standardCode, type);
  }

  return STANDARD_EMPLOYMENT_TYPE_CODES.flatMap((code) => {
    const match = byCode.get(code);
    return match ? [match] : [];
  });
}
