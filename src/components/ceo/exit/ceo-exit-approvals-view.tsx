"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { CeoExitApprovalQueue } from "@/components/ceo/exit/ceo-exit-approval-queue";
import { CeoExitProcessedTable } from "@/components/ceo/exit/ceo-exit-processed-table";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { fetchCeoExitApprovalQueueAction } from "@/lib/ceo/actions/ceo-exit-actions";
import {
  CEO_APPROVALS_SECTION_HELP,
  CEO_SECTION_HELP_DESCRIPTION,
} from "@/lib/ceo/section-help";
import { useApprovalsSync } from "@/lib/approvals/use-approvals-sync";
import { LEAVE_MONTH_OPTIONS } from "@/lib/leave/services/leave-utils";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  approvalQueue: ExitResignationItem[];
  processedItems: ExitResignationItem[];
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

export function CeoExitApprovalsView({
  approvalQueue: initialQueue,
  processedItems: initialProcessed,
  initialMonth,
  initialYear,
}: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [approvalQueue, setApprovalQueue] = useState(
    () => initialQueue ?? [],
  );
  const [processedItems, setProcessedItems] = useState(
    () => initialProcessed ?? [],
  );
  const [isPending, startTransition] = useTransition();

  const monthItems = useMemo(
    () => LEAVE_MONTH_OPTIONS.map((item) => ({ value: String(item.value), label: item.label })),
    [],
  );
  const yearItems = useMemo(() => yearOptions(initialYear), [initialYear]);

  const refreshQueue = useCallback(
    (nextMonth = month, nextYear = year) => {
      startTransition(async () => {
        const result = await fetchCeoExitApprovalQueueAction({
          month: nextMonth,
          year: nextYear,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        setApprovalQueue(
          Array.isArray(result.data.queue) ? result.data.queue : [],
        );
        setProcessedItems(
          Array.isArray(result.data.processed) ? result.data.processed : [],
        );
        setMonth(result.data.month);
        setYear(result.data.year);
      });
    },
    [month, year],
  );

  useApprovalsSync({
    onRefresh: refreshQueue,
    tables: ["exit_resignations"],
  });

  const handleItemActed = useCallback(
    (item?: ExitResignationItem, status?: "approved" | "rejected") => {
      if (item && status) {
        setApprovalQueue((prev) => prev.filter((row) => row.id !== item.id));
        setProcessedItems((prev) => [
          {
            ...item,
            exitStatus: status === "approved" ? "clearance" : "rejected",
            ceoActedAt: new Date().toISOString(),
          },
          ...prev.filter((row) => row.id !== item.id),
        ]);
      }
      refreshQueue();
    },
    [refreshQueue],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionHelpButton
            title={CEO_APPROVALS_SECTION_HELP.exit.title}
            points={[...CEO_APPROVALS_SECTION_HELP.exit.points]}
            description={CEO_SECTION_HELP_DESCRIPTION}
          >
            <h1 className="text-2xl font-semibold tracking-tight">Exit Approvals</h1>
          </SectionHelpButton>
          <p className="mt-1 text-sm text-muted-foreground">
            Final CEO approval for resignations already cleared by manager and HR.
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

      <CeoExitApprovalQueue
        items={approvalQueue}
        isLoading={isPending}
        onActed={handleItemActed}
      />

      <CeoExitProcessedTable
        items={processedItems}
        month={month}
        year={year}
        isLoading={isPending}
      />
    </div>
  );
}
