"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/common";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import { ManagerDashboardHeader } from "@/components/manager/manager-dashboard-header";
import { ManagerDashboardKpis } from "@/components/manager/manager-dashboard-kpis";
import { ManagerDashboardPanels } from "@/components/manager/manager-dashboard-panels";
import type { ManagerActionItem, ManagerDashboardData } from "@/types/manager-dashboard";
import { useAuth } from "@/providers/auth-provider";

type ManagerDashboardProps = {
  data: ManagerDashboardData;
  error?: string | null;
};

function filterActionItems(
  items: ManagerActionItem[],
  permissions: {
    leaveApprove: boolean;
    attendanceApprove: boolean;
    performance: boolean;
    recruitment: boolean;
  },
): ManagerActionItem[] {
  return items.filter((item) => {
    switch (item.kind) {
      case "leave_approval":
        return permissions.leaveApprove;
      case "attendance_correction":
        return permissions.attendanceApprove;
      case "performance_review":
      case "probation":
        return permissions.performance;
      case "interview":
        return permissions.recruitment;
      case "birthday":
        return true;
      default:
        return true;
    }
  });
}

export function ManagerDashboard({ data, error }: ManagerDashboardProps) {
  const { profile, hasPermission, hasAnyPermission } = useAuth();
  const [referenceDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const permissions = useMemo(
    () => ({
      leaveApprove: hasPermission("leave.approve"),
      attendanceApprove: hasAnyPermission([
        "attendance_correction.approve",
        "attendance_correction.view",
      ]),
      performance: hasAnyPermission(["performance.view", "performance.manage"]),
      recruitment: hasAnyPermission(["recruitment.view", "recruitment.manage"]),
    }),
    [hasPermission, hasAnyPermission],
  );

  const filteredKpis = useMemo(
    () => ({
      teamSize: data.kpis.teamSize,
      presentToday: data.kpis.presentToday,
      onLeaveToday: data.kpis.onLeaveToday,
      lateToday: data.kpis.lateToday,
      pendingLeaveApprovals: permissions.leaveApprove
        ? data.kpis.pendingLeaveApprovals
        : 0,
      pendingPerformanceReviews: permissions.performance
        ? data.kpis.pendingPerformanceReviews
        : 0,
      openRecruitmentRequests: permissions.recruitment
        ? data.kpis.openRecruitmentRequests
        : 0,
      probationEndingSoon: permissions.performance ? data.kpis.probationEndingSoon : 0,
    }),
    [data.kpis, permissions],
  );

  const filteredActions = useMemo(
    () => filterActionItems(data.actionItems, permissions),
    [data.actionItems, permissions],
  );

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
        <ErrorState title="Unable to load manager dashboard" description={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 md:p-4 lg:gap-3 lg:overflow-hidden lg:p-5">
      <div className="flex shrink-0 flex-col gap-2 lg:gap-3">
        <ManagerDashboardHeader />
        <ManagerDashboardKpis kpis={filteredKpis} permissions={permissions} />
      </div>

      <section className="flex min-h-0 flex-1 flex-col lg:overflow-hidden">
        <ManagerDashboardPanels
          actionItems={filteredActions}
          activities={data.activities}
          focusFilter="all"
          selectedEmployeeId={null}
        />
      </section>

      <DailyBoostCard
        firstName={profile.employee.firstName}
        lastName={profile.employee.lastName}
        personKey={profile.employee.id}
        referenceDate={referenceDate}
        compact
        className="shrink-0"
      />
    </div>
  );
}
