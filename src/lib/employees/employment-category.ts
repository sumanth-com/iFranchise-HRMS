import {
  normalizeStandardEmploymentTypeCode,
  type StandardEmploymentTypeCode,
} from "@/lib/employees/standard-employment-types";

export type EmploymentCategoryFilter =
  | "all"
  | "probation"
  | "internship"
  | "full_time"
  | "former";

export const DEFAULT_EMPLOYMENT_CATEGORY_FILTER: EmploymentCategoryFilter = "all";

export const EMPLOYMENT_CATEGORY_FILTER_OPTIONS: Array<{
  value: EmploymentCategoryFilter;
  label: string;
}> = [
  { value: "all", label: "All Employees" },
  { value: "probation", label: "Probation" },
  { value: "internship", label: "Internship" },
  { value: "full_time", label: "Full Time" },
  { value: "former", label: "Former Employees" },
];

export function parseEmploymentCategoryFilter(
  value: string | null | undefined,
): EmploymentCategoryFilter {
  if (
    value === "all" ||
    value === "probation" ||
    value === "internship" ||
    value === "full_time" ||
    value === "former"
  ) {
    return value;
  }
  return DEFAULT_EMPLOYMENT_CATEGORY_FILTER;
}

export function isFormerEmploymentCategory(
  category: EmploymentCategoryFilter | null | undefined,
): boolean {
  return category === "former";
}

export function matchesEmploymentCategoryFilter(
  category: EmploymentCategoryFilter,
  input: {
    employmentTypeCode?: string | null;
    employmentStatus?: string | null;
  },
): boolean {
  if (category === "former") {
    return (
      input.employmentStatus === "resigned" ||
      input.employmentStatus === "terminated"
    );
  }

  if (category === "all") return true;

  const typeCode = normalizeStandardEmploymentTypeCode(input.employmentTypeCode);

  if (category === "full_time") return typeCode === "FULL_TIME";
  if (category === "internship") return typeCode === "INTERN";
  return typeCode === "PROBATION";
}

export function employmentCategoryTypeCodes(
  category: Exclude<EmploymentCategoryFilter, "all" | "former">,
): StandardEmploymentTypeCode[] {
  if (category === "full_time") return ["FULL_TIME"];
  if (category === "internship") return ["INTERN"];
  return ["PROBATION"];
}
