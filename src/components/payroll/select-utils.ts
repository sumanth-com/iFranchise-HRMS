import type { LookupOption } from "@/types/employee";

export type SelectItemOption = {
  value: string;
  label: string;
};

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

export function getYearSelectItems(
  years: number[] = [2025, 2026, 2027],
): SelectItemOption[] {
  return years.map((year) => ({
    value: String(year),
    label: String(year),
  }));
}

export function toSelectItems(
  entries: Record<string, string> | Array<{ value: string; label: string }>,
): SelectItemOption[] {
  if (Array.isArray(entries)) {
    return entries;
  }

  return Object.entries(entries).map(([value, label]) => ({ value, label }));
}
