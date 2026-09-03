import { roundCurrency } from "@/lib/payroll/services/payroll-utils";
import type { SalaryStructureItem } from "@/types/payroll";

export type SalaryStructurePeriodFilters = {
  month: number | "all";
  year: number | "all";
  employeeId: string | "all";
  status: "all" | "current" | "historical" | "not_configured";
  today?: Date;
};

export function calendarDaysInYearMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthDateBounds(month: number, year: number): {
  start: string;
  end: string;
  calendarDays: number;
} {
  const calendarDays = calendarDaysInYearMonth(month, year);
  const mm = String(month).padStart(2, "0");
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(calendarDays).padStart(2, "0")}`,
    calendarDays,
  };
}

export function monthlyGrossPerDay(gross: number, calendarDays: number): number {
  if (!(gross > 0) || calendarDays <= 0) return 0;
  return roundCurrency(gross / calendarDays);
}

export function salaryStructureCoversPeriod(
  effectiveFrom: string,
  effectiveTo: string | null | undefined,
  periodStart: string,
  periodEnd: string,
): boolean {
  const from = effectiveFrom.slice(0, 10);
  const to = effectiveTo?.slice(0, 10) ?? null;
  return from <= periodEnd && (to == null || to >= periodStart);
}

export function employeeJoinedBy(
  joiningDate: string | null | undefined,
  periodEnd: string,
): boolean {
  if (!joiningDate) return true;
  return joiningDate.slice(0, 10) <= periodEnd;
}

export function isUnsetSalaryStructure(id: string): boolean {
  return id.startsWith("not_set_");
}

function periodForFilters(
  month: number | "all",
  year: number | "all",
  today: Date,
): { start: string; end: string } | null {
  const resolvedYear = year === "all" ? today.getFullYear() : year;
  if (month !== "all") {
    return monthDateBounds(month, resolvedYear);
  }
  if (year !== "all") {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return null;
}

function pickLatestCovering(
  rows: SalaryStructureItem[],
  periodStart: string,
  periodEnd: string,
): SalaryStructureItem | null {
  const covering = rows.filter(
    (row) =>
      !isUnsetSalaryStructure(row.id) &&
      salaryStructureCoversPeriod(row.effectiveFrom, row.effectiveTo, periodStart, periodEnd),
  );
  if (covering.length === 0) return null;
  return covering.reduce((latest, row) =>
    row.effectiveFrom.slice(0, 10) > latest.effectiveFrom.slice(0, 10) ? row : latest,
  );
}

function latestConfigured(rows: SalaryStructureItem[]): SalaryStructureItem | null {
  const configured = rows.filter((row) => !isUnsetSalaryStructure(row.id));
  if (configured.length === 0) return null;
  const current = configured.find((row) => row.isCurrent);
  if (current) return current;
  return configured.reduce((latest, row) =>
    row.effectiveFrom.slice(0, 10) > latest.effectiveFrom.slice(0, 10) ? row : latest,
  );
}

function placeholderForEmployee(rows: SalaryStructureItem[]): SalaryStructureItem | null {
  return rows.find((row) => isUnsetSalaryStructure(row.id)) ?? null;
}

function joiningDateOf(rows: SalaryStructureItem[]): string | null {
  return rows.find((row) => row.joiningDate)?.joiningDate ?? rows[0]?.joiningDate ?? null;
}

/**
 * Month/year filters show the structure in force for that period (carried
 * forward from an earlier effective date). Employees who joined after the
 * period are omitted. "All months" shows one current row per person.
 */
export function filterSalaryStructuresForPeriod(
  records: SalaryStructureItem[],
  filters: SalaryStructurePeriodFilters,
): SalaryStructureItem[] {
  const today = filters.today ?? new Date();
  const period = periodForFilters(filters.month, filters.year, today);
  const grouped = new Map<string, SalaryStructureItem[]>();

  for (const record of records) {
    if (filters.employeeId !== "all" && record.employeeId !== filters.employeeId) {
      continue;
    }
    const list = grouped.get(record.employeeId) ?? [];
    list.push(record);
    grouped.set(record.employeeId, list);
  }

  const result: SalaryStructureItem[] = [];

  for (const rows of grouped.values()) {
    if (period && !employeeJoinedBy(joiningDateOf(rows), period.end)) {
      continue;
    }

    const configured = rows.filter((row) => !isUnsetSalaryStructure(row.id));
    const placeholder = placeholderForEmployee(rows);

    if (period) {
      const inForce = pickLatestCovering(configured, period.start, period.end);
      const endedBefore = configured.filter(
        (row) =>
          row.effectiveTo != null && row.effectiveTo.slice(0, 10) < period.start,
      );

      if (filters.status === "historical") {
        result.push(...endedBefore);
        continue;
      }

      if (inForce) {
        if (filters.status === "not_configured") continue;
        result.push({ ...inForce, isCurrent: true });
        continue;
      }

      if (filters.status === "current") continue;
      if (placeholder) result.push(placeholder);
      continue;
    }

    const current = latestConfigured(configured);
    const historical = configured.filter((row) => row.id !== current?.id);

    if (filters.status === "historical") {
      result.push(...historical.filter((row) => !row.isCurrent));
      continue;
    }
    if (filters.status === "current") {
      if (current?.isCurrent) result.push(current);
      continue;
    }
    if (filters.status === "not_configured") {
      if (!current && placeholder) result.push(placeholder);
      continue;
    }

    if (current) result.push(current);
    else if (placeholder) result.push(placeholder);
  }

  result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  return result;
}
