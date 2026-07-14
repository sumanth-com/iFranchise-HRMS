"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import {
  ManagerTeamMemberDrawer,
  ManagerTeamMemberTabBar,
  MANAGER_TEAM_PROFILE_TABS,
  type TeamMemberDrawerTab,
} from "@/components/manager/team/manager-team-member-drawer";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { LookupOption } from "@/types/employee";

type ManagerTeamMemberProfileViewProps = {
  employeeId: string;
  managerEmployeeId: string;
  teamMemberOptions: LookupOption[];
  designationOptions: LookupOption[];
};

export function ManagerTeamMemberProfileView({
  employeeId,
  managerEmployeeId,
  teamMemberOptions,
  designationOptions,
}: ManagerTeamMemberProfileViewProps) {
  const [activeTab, setActiveTab] = useState<TeamMemberDrawerTab>("overview");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={MANAGER_ROUTES.team}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Back to My Team
        </Link>
        <ManagerTeamMemberTabBar
          tabs={MANAGER_TEAM_PROFILE_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="min-w-0 flex-1"
        />
      </div>

      <ManagerTeamMemberDrawer
        employeeId={employeeId}
        open
        embedded
        readOnly
        hideTabBar
        controlledActiveTab={activeTab}
        onActiveTabChange={setActiveTab}
        initialTab="overview"
        onOpenChange={() => undefined}
        teamMemberOptions={teamMemberOptions}
        designationOptions={designationOptions}
        managerEmployeeId={managerEmployeeId}
      />
    </div>
  );
}
