"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { SectionHelpButton } from "@/components/common/section-help-button";
import { CeoLeaveApprovalQueue } from "@/components/ceo/leave/ceo-leave-approval-queue";
import { CeoLeaveDetailDrawer } from "@/components/ceo/leave/ceo-leave-detail-drawer";
import { CeoLeaveProcessedTable } from "@/components/ceo/leave/ceo-leave-processed-table";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { fetchCeoApprovalQueueAction } from "@/lib/ceo/actions/ceo-leave-actions";
import {
  CEO_APPROVALS_SECTION_HELP,
  CEO_SECTION_HELP_DESCRIPTION,
} from "@/lib/ceo/section-help";
import { LEAVE_MONTH_OPTIONS } from "@/lib/leave/services/leave-utils";
import type { CeoApprovalQueueItem, CeoForwardTarget, CeoLeaveRecord } from "@/types/ceo-leave";

type CeoLeaveApprovalsViewProps = {
  approvalQueue: CeoApprovalQueueItem[];
  processedLeaves: CeoLeaveRecord[];
  forwardTargets: CeoForwardTarget[];
  initialMonth: number;
  initialYear: number;
};

function yearOptions(centerYear: number) {
  const years: { value: string; label: string }[] = [];
  for (let y = centerYear + 1; y >= centerYear - 4; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export function CeoLeaveApprovalsView({
  approvalQueue: initialQueue,
  processedLeaves: initialProcessed,
  forwardTargets,
  initialMonth,
  initialYear,
}: CeoLeaveApprovalsViewProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [approvalQueue, setApprovalQueue] = useState(initialQueue);
  const [processedLeaves, setProcessedLeaves] = useState(initialProcessed);
  const [isPending, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const monthItems = useMemo(
    () => LEAVE_MONTH_OPTIONS.map((item) => ({ value: String(item.value), label: item.label })),
    [],
  );
  const yearItems = useMemo(() => yearOptions(initialYear), [initialYear]);

  const refreshQueue = useCallback(
    (nextMonth = month, nextYear = year) => {
      startTransition(async () => {
        const result = await fetchCeoApprovalQueueAction({
          month: nextMonth,
          year: nextYear,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        setApprovalQueue(result.data.queue);
        setProcessedLeaves(result.data.processed);
        setMonth(result.data.month);
        setYear(result.data.year);
      });
    },
    [month, year],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionHelpButton
            title={CEO_APPROVALS_SECTION_HELP.leave.title}
            points={[...CEO_APPROVALS_SECTION_HELP.leave.points]}
            description={CEO_SECTION_HELP_DESCRIPTION}
          >
            <h1 className="text-2xl font-semibold tracking-tight">Leave Approvals</h1>
          </SectionHelpButton>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and approve leave requests assigned to you. HR and Manager leave comes
            to you directly. Employee requests reach you only when routed for executive
            approval.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <LabeledSelect
            items={monthItems}
            value={String(month)}
            onValueChange={(value) => {
              const nextMonth = Number(value);
              setMonth(nextMonth);
              refreshQueue(nextMonth, year);
            }}
            placeholder="Month"
            disabled={isPending}
            triggerClassName="h-9 w-[9.5rem]"
            alignItemWithTrigger={false}
          />
          <LabeledSelect
            items={yearItems}
            value={String(year)}
            onValueChange={(value) => {
              const nextYear = Number(value);
              setYear(nextYear);
              refreshQueue(month, nextYear);
            }}
            placeholder="Year"
            disabled={isPending}
            triggerClassName="h-9 w-[6.5rem]"
            alignItemWithTrigger={false}
          />
        </div>
      </div>

      <CeoLeaveApprovalQueue
        items={approvalQueue}
        isLoading={isPending}
        onView={(id) => {
          setDetailId(id);
          setDetailOpen(true);
        }}
        onActed={() => refreshQueue()}
      />

      <CeoLeaveProcessedTable
        items={processedLeaves}
        isLoading={isPending}
        month={month}
        year={year}
        onView={(id) => {
          setDetailId(id);
          setDetailOpen(true);
        }}
      />

      <CeoLeaveDetailDrawer
        leaveRequestId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        forwardTargets={forwardTargets}
        onActed={() => refreshQueue()}
      />
    </div>
  );
}
