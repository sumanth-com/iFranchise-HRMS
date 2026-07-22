import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { HrPayrollHubView } from "@/components/payroll/hr-payroll-hub-view";
import { getEmployeePayrollData } from "@/lib/employee/services/employee-payroll-queries";
import {
  getPayrollSummary,
  listPayrollRuns,
} from "@/lib/payroll/services/payroll-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import { payrollListParamsSchema } from "@/lib/validations/payroll";
import { siteConfig } from "@/config/site";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const TEAM_PAYROLL_PERMISSIONS = [
  "payroll.view",
  "payroll.generate",
  "payroll.approve",
  "payslip.view",
] as const;

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function parseSection(value: string | undefined): "my" | "team" {
  return value === "team" ? "team" : "my";
}

async function PayrollContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerAnyPermission(["payroll.view", "payslip.view"]);
  const supabase = await createClient();
  const raw = await searchParams;
  const now = new Date();
  const section = parseSection(firstString(raw.tab));
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [
    ...TEAM_PAYROLL_PERMISSIONS,
  ]);

  const teamParams = payrollListParamsSchema.parse({
    page: 1,
    pageSize: 5,
    month: raw.month ?? now.getMonth() + 1,
    year: raw.year ?? now.getFullYear(),
  });

  const [selfData, summary, recentRuns] = await Promise.all([
    getEmployeePayrollData(supabase, profile, siteConfig.url),
    canViewTeam
      ? getPayrollSummary(supabase, profile, teamParams.month, teamParams.year)
      : Promise.resolve(null),
    canViewTeam
      ? listPayrollRuns(supabase, profile, teamParams)
      : Promise.resolve(null),
  ]);

  return (
    <HrPayrollHubView
      initialSection={section}
      canViewTeam={canViewTeam}
      selfPayroll={selfData}
      teamPayroll={{
        summary: summary ?? {
          totalPayroll: 0,
          employeesProcessed: 0,
          pendingPayroll: 0,
          grossPayroll: 0,
          totalDeductions: 0,
          netPayroll: 0,
          monthlyOverview: [],
        },
        records: recentRuns?.data ?? [],
        total: recentRuns?.total ?? 0,
        page: recentRuns?.page ?? 1,
        pageSize: recentRuns?.pageSize ?? 5,
        month: teamParams.month ?? now.getMonth() + 1,
        year: teamParams.year ?? now.getFullYear(),
      }}
    />
  );
}

export default function PayrollSelfServicePage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PayrollContent searchParams={searchParams} />
    </Suspense>
  );
}
