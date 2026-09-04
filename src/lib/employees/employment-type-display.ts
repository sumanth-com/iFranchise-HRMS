export function formatEmploymentTypeLabel(value: string | null | undefined) {
  if (!value?.trim()) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function employmentTypeStyleKey(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

const PREFERRED_EMPLOYMENT_TYPE_ORDER = [
  "FULL_TIME",
  "PROBATION",
  "INTERN",
] as const;

function employmentTypeRank(code: string | null | undefined, label: string) {
  const normalizedCode = (code ?? "").trim().toUpperCase();
  const byCode = PREFERRED_EMPLOYMENT_TYPE_ORDER.indexOf(
    normalizedCode as (typeof PREFERRED_EMPLOYMENT_TYPE_ORDER)[number],
  );
  if (byCode >= 0) return byCode;

  const key = employmentTypeStyleKey(label);
  if (key.includes("full")) return 0;
  if (key.includes("probation")) return 1;
  if (key.includes("intern")) return 2;
  if (key.includes("part")) return 3;
  if (key.includes("contract")) return 4;
  return 50;
}

export function sortEmploymentTypeOptions<T extends { label: string; code?: string | null }>(
  types: T[],
): T[] {
  return [...types].sort((left, right) => {
    const rankDiff =
      employmentTypeRank(left.code, left.label) - employmentTypeRank(right.code, right.label);
    if (rankDiff !== 0) return rankDiff;
    return left.label.localeCompare(right.label);
  });
}
