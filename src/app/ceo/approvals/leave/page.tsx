import { Suspense } from "react";

import { CeoLeaveApprovalsView } from "@/components/ceo/leave/ceo-leave-approvals-view";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getCeoForwardTargets,
  listCeoApprovalQueue,
  listCeoProcessedLeaveApprovals,
} from "@/lib/ceo/services/ceo-leave-queries";
import { ensurePendingExecutiveLeaveAssignedToCeo } from "@/lib/leave/services/leave-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function CeoLeaveApprovalsContent() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.ceo,
    "leave.approve",
  ]);
  const supabase = await createClient();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const period = { month, year };

  try {
    void ensurePendingExecutiveLeaveAssignedToCeo(
      profile.employee.organizationId,
      profile.employee.id,
    ).catch((error) => {
      console.error(
        "[ceo-leave] failed to assign pending executive leave to CEO",
        error instanceof Error ? error.message : error,
      );
    });

    const [approvalQueue, processedLeaves, forwardTargets] = await Promise.all([
      listCeoApprovalQueue(supabase, profile, period),
      listCeoProcessedLeaveApprovals(supabase, profile, period),
      getCeoForwardTargets(supabase, profile),
    ]);

    return (
      <CeoLeaveApprovalsView
        approvalQueue={approvalQueue}
        processedLeaves={processedLeaves}
        forwardTargets={forwardTargets}
        initialMonth={month}
        initialYear={year}
      />
    );
  } catch (error) {
    console.error("[ceo-leave] approvals page failed to load", error);
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          title="Couldn’t load leave approvals"
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

export default function CeoApprovalsLeavePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CeoLeaveApprovalsContent />
    </Suspense>
  );
}
