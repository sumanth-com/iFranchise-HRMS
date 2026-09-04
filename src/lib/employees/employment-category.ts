import {
  normalizeStandardEmploymentTypeCode,
  type StandardEmploymentTypeCode,
} from "@/lib/employees/standard-employment-types";

export type EmploymentCategoryFilter = "all" | "probation" | "full_time";

export const DEFAULT_EMPLOYMENT_CATEGORY_FILTER: EmploymentCategoryFilter = "all";

function upper(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

export function isFullTimeEmploymentTypeCode(code: string | null | undefined): boolean {
  return upper(code) === "FULL_TIME";
}

export function matchesEmploymentCategoryFilter(
  category: EmploymentCategoryFilter,
  input: {
    employmentTypeCode?: string | null;
  },
): boolean {
  if (category === "all") return true;

  const typeCode = normalizeStandardEmploymentTypeCode(input.employmentTypeCode);

  if (category === "full_time") {
    return typeCode === "FULL_TIME";
  }

  return typeCode === "INTERN" || typeCode === "PROBATION";
}

export function employmentCategoryTypeCodes(
  category: Exclude<EmploymentCategoryFilter, "all">,
): StandardEmploymentTypeCode[] {
  if (category === "full_time") return ["FULL_TIME"];
  return ["INTERN", "PROBATION"];
}
