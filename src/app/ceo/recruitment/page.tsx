import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { RecruitmentDashboardView } from "@/components/recruitment/recruitment-dashboard-view";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import { getRecruitmentSummary } from "@/lib/recruitment/services/recruitment-queries";
import { createClient } from "@/lib/supabase/server";

async function CeoRecruitmentDashboardContent() {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const summary = await getRecruitmentSummary(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <RecruitmentDashboardView
        summary={summary}
        basePath={CEO_ROUTES.recruitment}
        readOnly
      />
    </div>
  );
}

export default function CeoRecruitmentDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CeoRecruitmentDashboardContent />
    </Suspense>
  );
}
