import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { ModuleReportsView } from "@/components/reports/module-reports-view";
import { ceoOrViewPermission } from "@/lib/ceo/read-only-permissions";
import { isManagerAllowedReportKey } from "@/lib/manager/reports/manager-report-definitions";
import { isManagerOnlyProfile } from "@/lib/manager/portal-scope";
import { REPORT_DEFINITIONS } from "@/lib/reports/constants";
import { getReportsLookups } from "@/lib/reports/services/reports-queries";
import { defaultDateRangeForCurrentMonth } from "@/lib/reports/services/reports-utils";
import { requireServerAnyPermission } from "@/lib/permissions/server";
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
  const periodDefault = defaultDateRangeForCurrentMonth();

  return {
    dateFrom: firstString(raw.dateFrom) ?? periodDefault.dateFrom,
    dateTo: firstString(raw.dateTo) ?? periodDefault.dateTo,
    departmentId: firstString(raw.departmentId),
    designationId: firstString(raw.designationId),
    employeeId: firstString(raw.employeeId),
    status: firstString(raw.status),
    month: monthRaw ? Number(monthRaw) : periodDefault.month,
    year: yearRaw ? Number(yearRaw) : periodDefault.year,
  };
}

export async function loadModuleReportsPage(
  module: ReportModuleKey,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) {
  const profile = await requireServerAnyPermission(ceoOrViewPermission("reports.view"));
  const supabase = await createClient();
  const raw = await searchParams;
  const isCeo = profile.permissionCodes.includes(PORTAL_PERMISSIONS.ceo);
  const isManager = isManagerOnlyProfile(profile);
  const permissionCodes =
    isCeo || isManager
      ? [...new Set([...profile.permissionCodes, "reports.view", "reports.export"])]
      : profile.permissionCodes;

  const definitions = REPORT_DEFINITIONS.filter((d) => {
    if (d.module !== module) return false;
    if (isManager && !isManagerAllowedReportKey(d.key)) return false;
    return true;
  }).map(
    (d) => ({
      key: d.key,
      title: d.title,
      description: d.description,
      purpose: d.purpose,
      filterSummary: d.filterSummary,
      exportFormats: d.exportFormats,
      usageInformation: d.usageInformation,
    }),
  );

  const requested = firstString(raw.report) as ReportKey | undefined;
  const reportKey =
    requested && definitions.some((d) => d.key === requested)
      ? requested
      : (definitions[0]?.key as ReportKey | undefined);

  const filters = parseFilters(raw);
  const lookups = await getReportsLookups(supabase, profile);

  return (
    <ModuleReportsView
      key={`${module}-reports-v4`}
      module={module}
      definitions={definitions}
      lookups={lookups}
      permissionCodes={permissionCodes}
      initialReportKey={reportKey}
      defaultFilters={filters}
    />
  );
}
