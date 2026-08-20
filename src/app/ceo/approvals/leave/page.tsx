import { Suspense } from "react";

import { CeoLeaveApprovalsView } from "@/components/ceo/leave/ceo-leave-approvals-view";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  getCeoForwardTargets,
  listCeoApprovalQueue,
} from "@/lib/ceo/services/ceo-leave-queries";
import { ensurePendingHrLeaveAssignedToCeo } from "@/lib/leave/services/leave-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function CeoLeaveApprovalsContent() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.ceo,
    "leave.approve",
  ]);
  const supabase = await createClient();

  await ensurePendingHrLeaveAssignedToCeo(
    profile.employee.organizationId,
    profile.employee.id,
  ).catch(
    (error) => {
      console.error(
        "[ceo-leave] failed to assign pending HR leave to CEO",
        error instanceof Error ? error.message : error,
      );
    },
  );

  const [approvalQueue, forwardTargets] = await Promise.all([
    listCeoApprovalQueue(supabase, profile),
    getCeoForwardTargets(supabase, profile),
  ]);

  return (
    <CeoLeaveApprovalsView
      approvalQueue={approvalQueue}
      forwardTargets={forwardTargets}
    />
  );
}

export default function CeoApprovalsLeavePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoLeaveApprovalsContent />
    </Suspense>
  );
}
