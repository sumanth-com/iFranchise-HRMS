"use client";

import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EmployeePayrollTimelineStage } from "@/types/employee-payroll";

type PaymentTimelineProps = {
  stages: EmployeePayrollTimelineStage[];
};

function fmtStageTime(value: string | null, done: boolean): string {
  if (value) {
    try {
      return format(parseISO(value), "dd MMM yyyy, h:mm a");
    } catch {
      return "Completed";
    }
  }
  return done ? "Completed" : "Pending";
}

export function PaymentTimeline({ stages }: PaymentTimelineProps) {
  const lastDoneIndex = stages.reduce((acc, stage, index) => (stage.done ? index : acc), -1);
  const allDone = stages.every((stage) => stage.done);
  const activeIndex = allDone ? -1 : lastDoneIndex + 1;

  return (
    <ol className="relative" aria-label="Payment timeline">
      {stages.map((stage, index) => {
        const isDone = stage.done;
        const isActive = !allDone && index === activeIndex;
        const isPending = !isDone && !isActive;
        const isLast = index === stages.length - 1;
        const nextStage = stages[index + 1];
        const lineComplete = isDone && Boolean(nextStage?.done);
        const lineActive = isDone && !nextStage?.done && index + 1 === activeIndex;

        return (
          <li key={stage.key} className="relative flex gap-4">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <span
                className={cn(
                  "relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500",
                  isDone &&
                    "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
                  isActive &&
                    "border-emerald-500 bg-background text-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.18)] payment-timeline-node-active",
                  isPending && "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="size-3.5 stroke-[3]" aria-hidden />
                ) : isActive ? (
                  <span className="size-2 rounded-full bg-emerald-500 payment-timeline-node-dot" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/35" />
                )}
              </span>

              {!isLast ? (
                <div
                  className={cn(
                    "relative mt-1 min-h-8 w-0.5 flex-1 overflow-hidden rounded-full",
                    (lineComplete || lineActive) && "bg-emerald-500/15",
                    !lineComplete && !lineActive && "bg-border",
                  )}
                  aria-hidden
                >
                  {lineComplete ? (
                    <span className="payment-timeline-fill absolute inset-0 origin-top bg-emerald-500" />
                  ) : null}
                  {lineActive ? (
                    <>
                      <span className="absolute inset-0 bg-emerald-500/25" />
                      <span className="payment-timeline-flow absolute inset-x-0 top-0 h-full w-full" />
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className={cn("min-w-0 flex-1 pt-0.5", !isLast && "pb-6")}>
              <p
                className={cn(
                  "text-sm font-medium leading-tight",
                  isPending && "text-muted-foreground",
                  isActive && "text-emerald-700 dark:text-emerald-300",
                )}
              >
                {stage.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  isActive
                    ? "text-emerald-600/80 dark:text-emerald-400/80"
                    : "text-muted-foreground",
                )}
              >
                {isActive ? "In progress…" : fmtStageTime(stage.at, stage.done)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
