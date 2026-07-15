import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoDashboard } from "@/components/ceo/ceo-dashboard";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getCeoDashboardData } from "@/lib/ceo/services/ceo-dashboard-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type { CeoDashboardData } from "@/types/ceo-dashboard";

function emptyDashboard(): CeoDashboardData {
  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalEmployees: 0,
      activeEmployees: 0,
      newJoiners: 0,
      employeesExiting: 0,
      departments: 0,
      managers: 0,
      openPositions: 0,
      recruitmentPipeline: 0,
      pendingApprovals: 0,
      attendancePercent: 0,
      leavePercent: 0,
      averageProductivity: 0,
      payrollCost: 0,
      monthlyRevenue: null,
      attritionRate: 0,
      employeeSatisfaction: null,
      trainingCompletion: 0,
    },
    insights: [],
    organization: {
      departmentDistribution: [],
      managerDistribution: [],
      hierarchyDepth: 0,
      totalDepartments: 0,
      totalManagers: 0,
      reportingCoveragePercent: 0,
    },
    recruitment: {
      openJobs: 0,
      candidates: 0,
      interviewsToday: 0,
      offersPending: 0,
      hiringThisMonth: 0,
      timeToHireDays: 0,
      funnel: [],
    },
    performance: {
      companyAverageRating: 0,
      topPerformingDepartments: [],
      lowPerformingTeams: [],
      pendingReviews: 0,
      promotionRecommendations: 0,
    },
    payroll: {
      status: "Not started",
      completed: false,
      pending: false,
      salaryCost: 0,
      benefitsCost: 0,
      upcomingPayrollDate: null,
      monthlyTrend: [],
    },
    attendance: {
      presentPercent: 0,
      absentPercent: 0,
      latePercent: 0,
      workFromHome: 0,
      officeAttendance: 0,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      onLeaveToday: 0,
    },
    activities: [],
    approvals: [],
    charts: {
      employeeGrowth: [],
      hiringTrend: [],
      attendanceTrend: [],
      attritionTrend: [],
      payrollTrend: [],
      departmentGrowth: [],
    },
  };
}

export default async function CeoPortalPage() {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const supabase = await createClient();

  let data: CeoDashboardData;
  let error: string | null = null;

  try {
    data = await getCeoDashboardData(supabase, profile);
  } catch (loadError) {
    error =
      loadError instanceof Error
        ? loadError.message
        : "Failed to load executive dashboard data.";
    data = emptyDashboard();
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoDashboard data={data} error={error} />
    </Suspense>
  );
}
