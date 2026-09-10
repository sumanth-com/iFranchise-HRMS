import { redirect } from "next/navigation";
import { Suspense } from "react";

import { HrPayrollHubView } from "@/components/payroll/hr-payroll-hub-view";
import { TeamPayrollContentSkeleton } from "@/components/payroll/team-payroll-content-skeleton";
import { TeamPayrollSection } from "@/components/payroll/team-payroll-section";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { requireAccountantPortal } from "@/lib/accountant/permissions";
import { EMPTY_TEAM_SELF_PAYROLL } from "@/lib/dashboard/self-service/payroll-hub-section";
import {
  parseTeamPayrollSection,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type PageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountantPayrollSectionPage({
  params,
  searchParams,
}: PageProps) {
  const profile = await requireAccountantPortal();
  const { section } = await params;
  const raw = await searchParams;

  // Settings edits stay with HR; Employee Accounts remains available for accountants.
  if (section === TEAM_PAYROLL_SECTIONS.settings) {
    redirect(`${ACCOUNTANT_ROUTES.payroll}/${TEAM_PAYROLL_SECTIONS.run}`);
  }

  const teamSection = parseTeamPayrollSection(section);

  return (
    <HrPayrollHubView
      initialSection="team"
      canViewTeam
      selfPayroll={EMPTY_TEAM_SELF_PAYROLL}
      teamBasePath={ACCOUNTANT_ROUTES.payroll}
      hiddenSections={[TEAM_PAYROLL_SECTIONS.settings]}
    >
      <Suspense fallback={<TeamPayrollContentSkeleton />}>
        <TeamPayrollSection
          section={teamSection}
          rawSearchParams={raw}
          profile={profile}
          teamBasePath={ACCOUNTANT_ROUTES.payroll}
        />
      </Suspense>
    </HrPayrollHubView>
  );
}
