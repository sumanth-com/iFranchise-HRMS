import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ManagerDashboard } from "@/components/manager/manager-dashboard";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getManagerDashboardData } from "@/lib/manager/services/manager-dashboard-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { ManagerDashboardData } from "@/types/manager-dashboard";

const EMPTY_OVERVIEW: ManagerDashboardData = {
  generatedAt: new Date().toISOString(),
  teamMembers: [],
  kpis: {
    teamSize: 0,
    presentToday: 0,
    onLeaveToday: 0,
    lateToday: 0,
    pendingLeaveApprovals: 0,
    pendingPerformanceReviews: 0,
    openRecruitmentRequests: 0,
    probationEndingSoon: 0,
  },
  actionItems: [],
  activities: [],
  todayPulse: {
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    pendingApprovals: 0,
    exitRequests: 0,
    upcomingHolidays: [],
  },
  tasks: [],
  charts: {
    headcountByDepartment: [],
    attendanceTrend7Days: [],
    monthlyHiring: [],
    monthlyAttrition: [],
    leaveDistribution: [],
    genderDistribution: [],
    employmentTypeDistribution: [],
  },
  upcomingBirthdays: [],
  upcomingAnniversaries: [],
};

export default async function ManagerOverviewPage() {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const supabase = await createClient();

  let data: ManagerDashboardData = EMPTY_OVERVIEW;
  let error: string | null = null;

  try {
    data = await getManagerDashboardData(supabase, profile);
  } catch (loadError) {
    error =
      loadError instanceof Error
        ? loadError.message
        : "Failed to load manager overview.";
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<DashboardSkeleton />}>
        <ManagerDashboard data={data} error={error} />
      </Suspense>
    </div>
  );
}
