import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerDashboard } from "@/components/manager/manager-dashboard";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getManagerDashboardData } from "@/lib/manager/services/manager-dashboard-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerPortalPage() {
  const profile = await requireServerPermission(PORTAL_PERMISSIONS.manager);
  const supabase = await createClient();

  let data;
  let error: string | null = null;

  try {
    data = await getManagerDashboardData(supabase, profile);
  } catch (loadError) {
    error =
      loadError instanceof Error
        ? loadError.message
        : "Failed to load manager dashboard data.";
    data = {
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
    };
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerDashboard
        data={data}
        error={error}
        canInviteTeamMember
        inviteServiceReady={hasSupabaseServiceRoleEnv()}
      />
    </Suspense>
  );
}
