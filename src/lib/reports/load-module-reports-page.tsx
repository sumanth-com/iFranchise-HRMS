import { ModuleReportsView } from "@/components/reports/module-reports-view";
import { MODULE_REPORTS, REPORT_DEFINITIONS } from "@/lib/reports/constants";
import {
  getReportsLookups,
  runReport,
} from "@/lib/reports/services/reports-queries";
import { defaultDateRange } from "@/lib/reports/services/reports-utils";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { ReportFilters, ReportKey, ReportModuleKey } from "@/types/reports";

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseFilters(
  raw: Record<string, string | string[] | undefined>,
): ReportFilters {
  const monthRaw = firstString(raw.month);
  const yearRaw = firstString(raw.year);
  const fallback = defaultDateRange(30);

  return {
    dateFrom: firstString(raw.dateFrom) ?? fallback.dateFrom,
    dateTo: firstString(raw.dateTo) ?? fallback.dateTo,
    departmentId: firstString(raw.departmentId),
    branchId: firstString(raw.branchId),
    designationId: firstString(raw.designationId),
    employeeId: firstString(raw.employeeId),
    status: firstString(raw.status),
    month: monthRaw ? Number(monthRaw) : undefined,
    year: yearRaw ? Number(yearRaw) : undefined,
  };
}

export async function loadModuleReportsPage(
  module: ReportModuleKey,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  const profile = await requireServerPermission("reports.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const moduleKeys = MODULE_REPORTS[module];
  const definitions = REPORT_DEFINITIONS.filter((d) => d.module === module).map(
    (d) => ({
      key: d.key,
      title: d.title,
      description: d.description,
    }),
  );

  const requested = firstString(raw.report) as ReportKey | undefined;
  const reportKey =
    requested && moduleKeys.includes(requested)
      ? requested
      : (definitions[0]?.key as ReportKey | undefined);

  const filters = parseFilters(raw);
  const lookups = await getReportsLookups(supabase, profile);

  let initialResult = null;
  if (reportKey) {
    try {
      initialResult = await runReport(supabase, profile, reportKey, filters);
    } catch {
      initialResult = null;
    }
  }

  return (
    <ModuleReportsView
      module={module}
      definitions={definitions}
      lookups={lookups}
      permissionCodes={profile.permissionCodes}
      initialReportKey={reportKey}
      initialResult={initialResult}
      defaultFilters={filters}
    />
  );
}
