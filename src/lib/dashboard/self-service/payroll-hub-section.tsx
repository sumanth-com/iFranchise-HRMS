import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { HrPayrollHubView } from "@/components/payroll/hr-payroll-hub-view";
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

const TEAM_PAYROLL_PERMISSIONS = [
  "payroll.view",
  "payroll.generate",
  "payroll.approve",
  "payslip.view",
] as const;

export async function PayrollHubSection({
  section,
  teamSection = TEAM_PAYROLL_SECTIONS.dashboard,
  searchParams,
}: {
  section: "my" | "team";
  teamSection?: TeamPayrollSectionKey;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireServerAnyPermission(["payroll.view", "payslip.view"]);
  const supabase = await createClient();
  const raw = await searchParams;
  const canViewTeam = hasAnyPermission(profile.permissionCodes, [...TEAM_PAYROLL_PERMISSIONS]);

  const selfData = await getEmployeePayrollData(supabase, profile, {
    appOrigin: siteConfig.url,
  });

  return (
    <HrPayrollHubView
      initialSection={section}
      initialTeamSection={teamSection}
      canViewTeam={canViewTeam}
      selfPayroll={selfData}
    >
      {canViewTeam && section === "team" ? (
        <TeamPayrollSection
          section={teamSection}
          rawSearchParams={raw}
          profile={profile}
          supabase={supabase}
        />
      ) : null}
    </HrPayrollHubView>
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

  const resolvedSection = teamSection ?? TEAM_PAYROLL_SECTIONS.dashboard;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <PayrollHubSection
        section="team"
        teamSection={resolvedSection}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
