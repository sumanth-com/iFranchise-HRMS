import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { RecruitmentDashboardView } from "@/components/recruitment/recruitment-dashboard-view";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { requireManagerPortal } from "@/lib/manager/load-admin-context";
import { getRecruitmentSummary } from "@/lib/recruitment/services/recruitment-queries";
import { createClient } from "@/lib/supabase/server";

async function ManagerRecruitmentDashboardContent() {
  const profile = await requireManagerPortal();
  const supabase = await createClient();
  const summary = await getRecruitmentSummary(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <RecruitmentDashboardView
        summary={summary}
        basePath={MANAGER_ROUTES.recruitment}
        showOnboarding={false}
      />
    </div>
  );
}

export default function ManagerRecruitmentDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ManagerRecruitmentDashboardContent />
    </Suspense>
  );
}
