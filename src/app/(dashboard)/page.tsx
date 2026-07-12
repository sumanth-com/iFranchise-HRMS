import { Suspense } from "react";

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HrDashboard } from "@/components/dashboard/hr-dashboard";
import { getHrDashboardData } from "@/lib/dashboard/services/dashboard-queries";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function DashboardContent() {
  const profile = await requireAuthenticatedProfile();
  const supabase = await createClient();

  try {
    const data = await getHrDashboardData(supabase, profile);
    return (
      <HrDashboard data={data} permissionCodes={profile.permissionCodes} />
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data.";
    return (
      <HrDashboard
        data={{
          generatedAt: new Date().toISOString(),
          kpis: {
            totalEmployees: 0,
            presentToday: 0,
            onLeaveToday: 0,
            absentToday: 0,
            lateToday: 0,
            newJoinersThisMonth: 0,
            employeesExiting: 0,
            openRecruitments: 0,
            pendingApprovals: 0,
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
        }}
        permissionCodes={profile.permissionCodes}
        error={message}
      />
    );
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
