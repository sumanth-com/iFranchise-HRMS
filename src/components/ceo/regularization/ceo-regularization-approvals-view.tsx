"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { CeoRegularizationApprovalQueue } from "@/components/ceo/regularization/ceo-regularization-approval-queue";
import { CeoRegularizationProcessedTable } from "@/components/ceo/regularization/ceo-regularization-processed-table";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { fetchCeoRegularizationQueueAction } from "@/lib/ceo/actions/ceo-regularization-actions";
import { CEO_SECTION_HELP_DESCRIPTION } from "@/lib/ceo/section-help";
import { LEAVE_MONTH_OPTIONS } from "@/lib/leave/services/leave-utils";
import type { CeoRegularizationQueueItem } from "@/types/ceo-regularization";

type CeoRegularizationApprovalsViewProps = {
  approvalQueue: CeoRegularizationQueueItem[];
  processedItems: CeoRegularizationQueueItem[];
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

export function CeoRegularizationApprovalsView({
  approvalQueue: initialQueue,
  processedItems: initialProcessed,
  initialMonth,
  initialYear,
}: CeoRegularizationApprovalsViewProps) {
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
        const result = await fetchCeoRegularizationQueueAction({
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

      <CeoRegularizationApprovalQueue
        items={approvalQueue}
        isLoading={isPending}
        onActed={() => refreshQueue()}
      />

      <CeoRegularizationProcessedTable
        items={processedItems}
        month={month}
        year={year}
        isLoading={isPending}
      />
    </div>
  );
}
