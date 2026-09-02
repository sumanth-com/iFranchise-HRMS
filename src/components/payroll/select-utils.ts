import type { LookupOption } from "@/types/employee";

export type SelectItemOption = {
  value: string;
  label: string;
};

export function toLookupSelectItems(
  options: LookupOption[],
  config?: { showCode?: boolean },
): SelectItemOption[] {
  const showCode = config?.showCode ?? true;
  return options.map((option) => ({
    value: option.id,
    label: showCode && option.code ? `${option.label} (${option.code})` : option.label,
  }));
}

export function withSelectOption(
  items: SelectItemOption[],
  option: SelectItemOption,
  position: "start" | "end" = "start",
): SelectItemOption[] {
  return position === "start" ? [option, ...items] : [...items, option];
}

export function toEmployeeSelectItems(employees: LookupOption[]): SelectItemOption[] {
  return employees.map((employee) => ({
    value: employee.id,
    label: employee.code
      ? `${employee.label} (${employee.code})`
      : employee.label,
  }));
}

export function getMonthSelectItems(): SelectItemOption[] {
  return Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Date(2000, index, 1).toLocaleString("en-IN", { month: "long" }),
  }));
}

import { getHrmsYears, getHrmsYearSelectItems } from "@/lib/date/hrms-year";

export function getYearSelectItems(
  years: number[] = getHrmsYears(),
): SelectItemOption[] {
  return years.map((year) => ({
    value: String(year),
    label: String(year),
  }));
}

export { getHrmsYearSelectItems };

export function toSelectItems(
  entries: Record<string, string> | Array<{ value: string; label: string }>,
): SelectItemOption[] {
  if (Array.isArray(entries)) {
    return entries;
  }

  return Object.entries(entries).map(([value, label]) => ({ value, label }));
}
