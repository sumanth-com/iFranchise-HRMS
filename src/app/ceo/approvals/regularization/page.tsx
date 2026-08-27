import { Suspense } from "react";

import { CeoRegularizationApprovalsView } from "@/components/ceo/regularization/ceo-regularization-approvals-view";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  listCeoProcessedRegularizations,
  listCeoRegularizationApprovalQueue,
} from "@/lib/ceo/services/ceo-regularization-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function CeoRegularizationApprovalsContent() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.ceo,
    "attendance.view",
  ]);
  const supabase = await createClient();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const period = { month, year };

  try {
    const [approvalQueue, processedItems] = await Promise.all([
      listCeoRegularizationApprovalQueue(supabase, profile),
      listCeoProcessedRegularizations(supabase, profile, period).catch(() => []),
    ]);

    return (
      <CeoRegularizationApprovalsView
        approvalQueue={approvalQueue}
        processedItems={processedItems}
        initialMonth={month}
        initialYear={year}
      />
    );
  } catch (error) {
    console.error("[ceo-regularization] page failed to load", error);
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          title="Couldn’t load regularization approvals"
          description={
            error instanceof Error
              ? error.message
              : "Please refresh the page or try again in a moment."
          }
        />
      </div>
    );
  }
}

export default function CeoApprovalsRegularizationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CeoRegularizationApprovalsContent />
    </Suspense>
  );
}
