import { Suspense } from "react";
import { redirect } from "next/navigation";

import { HrPayrollHubView } from "@/components/payroll/hr-payroll-hub-view";
import { TeamPayrollContentSkeleton } from "@/components/payroll/team-payroll-content-skeleton";
import { TeamPayrollSection } from "@/components/payroll/team-payroll-section";
import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import { getEmployeePayrollData } from "@/lib/employee/services/employee-payroll-queries";
import {
  SELF_PAYROLL_ROUTES,
  TEAM_PAYROLL_SECTIONS,
  type TeamPayrollSection as TeamPayrollSectionKey,
} from "@/lib/payroll/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import type { EmployeePayrollData } from "@/types/employee-payroll";

const TEAM_PAYROLL_PERMISSIONS = [
  "payroll.view",
  "payroll.generate",
  "payroll.approve",
  "payslip.view",
] as const;

const EMPTY_TEAM_SELF_PAYROLL: EmployeePayrollData = {
  currencyCode: "INR",
  hasAnyData: false,
  kpis: {
    currentNetSalary: null,
    currentGrossSalary: null,
    nextSalaryDate: null,
    lastPaymentDate: null,
    latestStatus: null,
    ytdEarnings: 0,
    ytdTax: 0,
  },
  latest: null,
  latestTimeline: null,
  payslips: [],
  salaryStructure: null,
  bank: null,
  bonuses: [],
  reimbursements: [],
  trend: [],
  pendingPromotion: null,
  ytd: {
    earnings: 0,
    deductions: 0,
    net: 0,
    tax: 0,
    monthsCount: 0,
    financialYearLabel: "",
  },
};

export async function PayrollHubSection({
  section,
  searchParams,
}: {
  section: "my";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerAnyPermission(["payroll.view", "payslip.view"]);
  const supabase = await createClient();
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [...TEAM_PAYROLL_PERMISSIONS]);

  const selfData = await getEmployeePayrollData(supabase, profile, {
    appOrigin: siteConfig.url,
  });

  return (
    <HrPayrollHubView initialSection="my" canViewTeam={canViewTeam} selfPayroll={selfData} />
  );
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function PayrollTeamPage({
  searchParams,
  teamSection,
}: PageProps & { teamSection?: TeamPayrollSectionKey }) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_PAYROLL_ROUTES.list, raw, {
    teamSubPathFromSection: true,
  });
  if (legacy) redirect(legacy);

  const resolvedSection = teamSection ?? TEAM_PAYROLL_SECTIONS.run;
  const profile = await requireServerAnyPermission(["payroll.view", "payslip.view"]);
  const supabase = await createClient();
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [...TEAM_PAYROLL_PERMISSIONS]);

  return (
    <HrPayrollHubView
      initialSection="team"
      canViewTeam={canViewTeam}
      selfPayroll={EMPTY_TEAM_SELF_PAYROLL}
    >
      <Suspense fallback={<TeamPayrollContentSkeleton />}>
        <TeamPayrollSection
          section={resolvedSection}
          rawSearchParams={raw}
          profile={profile}
          supabase={supabase}
        />
      </Suspense>
    </HrPayrollHubView>
  );
}
