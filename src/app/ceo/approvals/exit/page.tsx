import { Suspense } from "react";

import { CeoExitApprovalsView } from "@/components/ceo/exit/ceo-exit-approvals-view";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  listCeoExitApprovalQueue,
  listCeoProcessedExitApprovals,
} from "@/lib/ceo/services/ceo-exit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function CeoExitApprovalsContent() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.ceo,
    "exit.view",
    "exit.approve",
  ]);
  const supabase = await createClient();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const period = { month, year };

  try {
    const [approvalQueue, processedItems] = await Promise.all([
      listCeoExitApprovalQueue(supabase, profile).catch((error) => {
        console.error("[ceo-exit] queue failed", error);
        return [] as Awaited<ReturnType<typeof listCeoExitApprovalQueue>>;
      }),
      listCeoProcessedExitApprovals(supabase, profile, period).catch((error) => {
        console.error("[ceo-exit] processed list failed", error);
        return [] as Awaited<ReturnType<typeof listCeoProcessedExitApprovals>>;
      }),
    ]);

    return (
      <CeoExitApprovalsView
        approvalQueue={approvalQueue ?? []}
        processedItems={processedItems ?? []}
        initialMonth={month}
        initialYear={year}
      />
    );
  } catch (error) {
    console.error("[ceo-exit] page failed to load", error);
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          title="Couldn’t load exit approvals"
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

export default function CeoApprovalsExitPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CeoExitApprovalsContent />
    </Suspense>
  );
}
