"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CeoBackToDashboard,
  CeoModulePageHeader,
} from "@/components/ceo/ceo-module-primitives";
import { CeoLeaveApprovalQueue } from "@/components/ceo/leave/ceo-leave-approval-queue";
import { CeoLeaveDetailDrawer } from "@/components/ceo/leave/ceo-leave-detail-drawer";
import {
  fetchCeoApprovalQueueAction,
} from "@/lib/ceo/actions/ceo-leave-actions";
import type { CeoApprovalQueueItem, CeoForwardTarget } from "@/types/ceo-leave";

type CeoLeaveApprovalsViewProps = {
  approvalQueue: CeoApprovalQueueItem[];
  forwardTargets: CeoForwardTarget[];
};

export function CeoLeaveApprovalsView({
  approvalQueue: initialQueue,
  forwardTargets,
}: CeoLeaveApprovalsViewProps) {
  const [approvalQueue, setApprovalQueue] = useState(initialQueue);
  const [isPending, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const refreshQueue = useCallback(() => {
    startTransition(async () => {
      const result = await fetchCeoApprovalQueueAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setApprovalQueue(result.data);
    });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <CeoBackToDashboard />

      <CeoModulePageHeader
        title="Leave Approvals"
        description="Review and approve leave requests assigned to you. Employee and manager requests flow through manager and HR first; HR requests require your approval."
      />

      <CeoLeaveApprovalQueue
        items={approvalQueue}
        forwardTargets={forwardTargets}
        isLoading={isPending}
        onView={(id) => {
          setDetailId(id);
          setDetailOpen(true);
        }}
        onActed={refreshQueue}
      />

      <CeoLeaveDetailDrawer
        leaveRequestId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        forwardTargets={forwardTargets}
        onActed={refreshQueue}
      />
    </div>
  );
}
