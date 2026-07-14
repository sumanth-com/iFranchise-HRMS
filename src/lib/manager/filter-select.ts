type FilterOption = {
  value: string;
  label: string;
};

export const FILTER_ANY_VALUE = "all";

export function filterSelectLabel(
  value: string | undefined | null,
  defaultLabel: string,
  options: ReadonlyArray<FilterOption>,
): string {
  const normalized = value ?? FILTER_ANY_VALUE;
  if (normalized === FILTER_ANY_VALUE) return defaultLabel;
  return options.find((option) => option.value === normalized)?.label ?? defaultLabel;
}

export function filterSelectLabelFromMap(
  value: string | undefined | null,
  defaultLabel: string,
  labels: Record<string, string>,
): string {
  const normalized = value ?? FILTER_ANY_VALUE;
  if (normalized === FILTER_ANY_VALUE) return defaultLabel;
  return labels[normalized] ?? defaultLabel;
}

export const MANAGER_FILTER_SELECT_CONTENT_CLASS =
  "min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,22rem)]";

export const MANAGER_TEAM_MEMBER_SELECT_CONTENT_CLASS =
  "min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,26rem)]";
