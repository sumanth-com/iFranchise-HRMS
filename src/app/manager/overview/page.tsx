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
    halfDayToday: 0,
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

async function ManagerOverviewContent() {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const supabase = await createClient();

  try {
    const data = await getManagerDashboardData(supabase, profile);
    return <ManagerDashboard data={data} error={null} />;
  } catch (loadError) {
    const error =
      loadError instanceof Error
        ? loadError.message
        : "Failed to load manager overview.";
    return <ManagerDashboard data={EMPTY_OVERVIEW} error={error} />;
  }
}

export default function ManagerOverviewPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<DashboardSkeleton />}>
        <ManagerOverviewContent />
      </Suspense>
    </div>
  );
}
