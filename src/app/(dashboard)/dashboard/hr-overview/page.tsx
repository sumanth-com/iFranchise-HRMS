import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HrDashboard } from "@/components/dashboard/hr-dashboard";
import { getHrDashboardData } from "@/lib/dashboard/services/dashboard-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { HrDashboardData } from "@/types/dashboard";

const EMPTY_DASHBOARD: HrDashboardData = {
  generatedAt: new Date().toISOString(),
  kpis: {
    totalEmployees: 0,
    presentToday: 0,
    onLeaveToday: 0,
    absentToday: 0,
    pendingLeaveApprovals: 0,
  },
  secondary: {
    attendancePercent: 0,
    leaveUtilizationPercent: 0,
    payrollStatus: "—",
    upcomingBirthdaysCount: 0,
    upcomingAnniversariesCount: 0,
    probationEndingSoon: 0,
    documentsExpiring: 0,
    assetsPendingReturn: 0,
    interviewsToday: 0,
    birthdaysToday: 0,
    exitClearancePending: 0,
  },
  charts: {
    headcountByDepartment: [],
    attendanceTrend7Days: [],
    monthlyHiring: [],
    monthlyAttrition: [],
    leaveDistribution: [],
    genderDistribution: [],
    employmentTypeDistribution: [],
  },
  activities: [],
  tasks: [],
  upcomingBirthdays: [],
  upcomingAnniversaries: [],
  upcomingInterviews: [],
  upcomingHolidays: [],
  recentEmployees: [],
  recentLeaveRequests: [],
  recentRecruitment: [],
  recentPayrollRuns: [],
};

async function HrOverviewContent() {
  const profile = await requireServerAnyPermission(["employee.view"]);
  const supabase = await createClient();

  try {
    const data = await getHrDashboardData(supabase, profile);
    return (
      <HrDashboard data={data} permissionCodes={profile.permissionCodes} />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load HR overview.";
    return (
      <HrDashboard
        data={EMPTY_DASHBOARD}
        permissionCodes={profile.permissionCodes}
        error={message}
      />
    );
  }
}

export default function HrOverviewPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HrOverviewContent />
    </Suspense>
  );
}
