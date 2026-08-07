import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { RecruitmentDashboardView } from "@/components/recruitment/recruitment-dashboard-view";
import { createClient } from "@/lib/supabase/server";
import { getRecruitmentSummary } from "@/lib/recruitment/services/recruitment-queries";
import { requireServerPermission } from "@/lib/permissions/server";

async function RecruitmentDashboardContent() {
  const profile = await requireServerPermission("recruitment.view");
  const supabase = await createClient();
  const summary = await getRecruitmentSummary(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <RecruitmentDashboardView summary={summary} />
    </div>
  );
}

export default function RecruitmentDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RecruitmentDashboardContent />
    </Suspense>
  );
}
