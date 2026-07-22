import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { RecruitmentDashboardPanels } from "@/components/recruitment/recruitment-dashboard-panels";
import { RecruitmentSummaryCards } from "@/components/recruitment/recruitment-summary-cards";
import { createClient } from "@/lib/supabase/server";
import { getRecruitmentSummary } from "@/lib/recruitment/services/recruitment-queries";
import { requireServerPermission } from "@/lib/permissions/server";

async function RecruitmentDashboardContent() {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
  const summary = await getRecruitmentSummary(supabase, profile);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recruitment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track open roles, candidates, interviews, offers, and hiring progress.
        </p>
      </div>
      <RecruitmentSummaryCards summary={summary} />
      <RecruitmentDashboardPanels summary={summary} />
    </>
  );
}

export default function RecruitmentDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RecruitmentDashboardContent />
    </Suspense>
  );
}
