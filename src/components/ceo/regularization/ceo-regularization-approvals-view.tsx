"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { CeoRegularizationApprovalQueue } from "@/components/ceo/regularization/ceo-regularization-approval-queue";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { fetchCeoRegularizationQueueAction } from "@/lib/ceo/actions/ceo-regularization-actions";
import { CEO_SECTION_HELP_DESCRIPTION } from "@/lib/ceo/section-help";
import type { CeoRegularizationQueueItem } from "@/types/ceo-regularization";

type CeoRegularizationApprovalsViewProps = {
  approvalQueue: CeoRegularizationQueueItem[];
};

export function CeoRegularizationApprovalsView({
  approvalQueue: initialQueue,
}: CeoRegularizationApprovalsViewProps) {
  const [approvalQueue, setApprovalQueue] = useState(initialQueue);
  const [isPending, startTransition] = useTransition();

  const refreshQueue = useCallback(() => {
    startTransition(async () => {
      const result = await fetchCeoRegularizationQueueAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setApprovalQueue(result.data);
    });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div>
        <SectionHelpButton
          title="Regularization approvals"
          points={[
            {
              label: "Executive routing",
              detail:
                "HR and Manager regularization requests route directly to the CEO.",
            },
            {
              label: "Employee workflow",
              detail:
                "Employee regularization keeps the existing manager/HR workflow.",
            },
          ]}
          description={CEO_SECTION_HELP_DESCRIPTION}
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            Attendance Regularization
          </h1>
        </SectionHelpButton>
        <p className="mt-1 text-sm text-muted-foreground">
          Review attendance regularization submitted by HR and Manager users. Employee
          requests continue through the standard approval workflow.
        </p>
      </div>

      <CeoRegularizationApprovalQueue
        items={approvalQueue}
        isLoading={isPending}
        onActed={refreshQueue}
      />
    </div>
  );
}
