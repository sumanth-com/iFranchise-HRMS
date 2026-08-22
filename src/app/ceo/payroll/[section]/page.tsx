import { redirect } from "next/navigation";
import { Suspense } from "react";

import { HrPayrollHubView } from "@/components/payroll/hr-payroll-hub-view";
import { TeamPayrollContentSkeleton } from "@/components/payroll/team-payroll-content-skeleton";
import { TeamPayrollSection } from "@/components/payroll/team-payroll-section";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  requireCeoPortal,
  toViewOnlyProfile,
} from "@/lib/ceo/read-only-permissions";
import { EMPTY_TEAM_SELF_PAYROLL } from "@/lib/dashboard/self-service/payroll-hub-section";
import {
  parseTeamPayrollSection,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

type PageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoPayrollSectionPage({
  params,
  searchParams,
}: PageProps) {
  const profile = await requireCeoPortal();
  const { section } = await params;
  const raw = await searchParams;

  if (section === TEAM_PAYROLL_SECTIONS.settings) {
    redirect(`${CEO_ROUTES.payroll}/${TEAM_PAYROLL_SECTIONS.run}`);
  }

  const teamSection = parseTeamPayrollSection(section);
  const viewProfile = toViewOnlyProfile(profile);

  return (
    <HrPayrollHubView
      initialSection="team"
      canViewTeam
      selfPayroll={EMPTY_TEAM_SELF_PAYROLL}
      teamBasePath={CEO_ROUTES.payroll}
      hiddenSections={[TEAM_PAYROLL_SECTIONS.settings]}
    >
      <Suspense fallback={<TeamPayrollContentSkeleton />}>
        <TeamPayrollSection
          section={teamSection}
          rawSearchParams={raw}
          profile={viewProfile}
          teamBasePath={CEO_ROUTES.payroll}
          canRunPayrollOverride
        />
      </Suspense>
    </HrPayrollHubView>
  );
}
