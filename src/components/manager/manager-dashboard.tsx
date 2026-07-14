"use client";

import { useState } from "react";

import { ErrorState } from "@/components/common";
import { ManagerDashboardHeader } from "@/components/manager/manager-dashboard-header";
import { ManagerDashboardKpis } from "@/components/manager/manager-dashboard-kpis";
import { ManagerDashboardPanels } from "@/components/manager/manager-dashboard-panels";
import type { ManagerDashboardFocus } from "@/lib/manager/dashboard-focus";
import type { ManagerDashboardData } from "@/types/manager-dashboard";

type ManagerDashboardProps = {
  data: ManagerDashboardData;
  error?: string | null;
  canInviteTeamMember?: boolean;
  inviteServiceReady?: boolean;
};

export function ManagerDashboard({
  data,
  error,
  canInviteTeamMember = true,
  inviteServiceReady = false,
}: ManagerDashboardProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [focusFilter, setFocusFilter] = useState<ManagerDashboardFocus>("all");

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
        <ErrorState title="Unable to load manager dashboard" description={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:p-4 lg:gap-4 lg:p-5">
      <ManagerDashboardHeader
        teamMembers={data.teamMembers}
        kpis={data.kpis}
        actionItems={data.actionItems}
        selectedEmployeeId={selectedEmployeeId}
        focusFilter={focusFilter}
        canInviteTeamMember={canInviteTeamMember}
        inviteServiceReady={inviteServiceReady}
        onEmployeeChange={setSelectedEmployeeId}
        onFocusChange={setFocusFilter}
      />
      <ManagerDashboardKpis kpis={data.kpis} />
      <ManagerDashboardPanels
        actionItems={data.actionItems}
        activities={data.activities}
        focusFilter={focusFilter}
        selectedEmployeeId={selectedEmployeeId}
      />
    </div>
  );
}
