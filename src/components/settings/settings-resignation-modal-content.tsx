"use client";

import { format } from "date-fns";
import { Loader2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { ResignationSubmitForm } from "@/components/exit/resignation-submit-form";
import { withdrawResignationAction } from "@/lib/exit/actions";
import {
  EXIT_STATUS_LABELS,
  exitStatusLabelForSettings,
  isExitAwaitingCeoApproval,
} from "@/lib/exit/constants";
import { cn } from "@/lib/utils";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  canApply: boolean;
  employeeId: string;
  defaultNoticePeriodDays: number;
  activeResignation: ExitResignationItem | null;
  rejectedResignation?: ExitResignationItem | null;
  onSubmitted?: () => void;
};

function statusClass(status: ExitResignationItem["exitStatus"]) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700";
  if (status === "rejected" || status === "withdrawn") return "bg-destructive/10 text-destructive";
  if (isExitAwaitingCeoApproval(status)) {
    return "bg-amber-500/10 text-amber-700";
  }
  return "bg-muted text-foreground";
}

export function SettingsResignationModalContent({
  canApply,
  employeeId,
  defaultNoticePeriodDays,
  activeResignation,
  rejectedResignation = null,
  onSubmitted,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (activeResignation) {
    const canWithdraw = isExitAwaitingCeoApproval(activeResignation.exitStatus);
    const ceoApproved = activeResignation.exitStatus === "completed";

    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Active resignation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted {format(new Date(activeResignation.resignationDate), "dd MMM yyyy")} ·
                Last working day{" "}
                {format(new Date(activeResignation.lastWorkingDay), "dd MMM yyyy")} ·{" "}
                {activeResignation.reason}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                statusClass(activeResignation.exitStatus),
              )}
            >
              {exitStatusLabelForSettings(activeResignation.exitStatus)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <ApprovalStep done label="Submitted" />
            <ApprovalStep done={ceoApproved} label="CEO approval" />
          </div>

          {canWithdraw ? (
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await withdrawResignationAction(activeResignation.id);
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Resignation withdrawn");
                  router.refresh();
                  onSubmitted?.();
                });
              }}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              <Undo2 className="mr-1.5 h-4 w-4" />
              Withdraw request
            </Button>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Your request is reviewed by the CEO. After approval your portal access will be
          deactivated.
        </p>
      </div>
    );
  }

  if (rejectedResignation) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-destructive">Resignation rejected</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {format(new Date(rejectedResignation.createdAt), "dd MMM yyyy")}
              {rejectedResignation.rejectedReason
                ? ` · ${rejectedResignation.rejectedReason}`
                : ""}
            </p>
          </div>
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            {EXIT_STATUS_LABELS.rejected}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your account remains active. You may submit a new resignation request if needed.
        </p>
      </div>
    );
  }

  if (!canApply) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to submit a resignation from this account. Contact HR if you need
        help with your exit process.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Your request is sent to the CEO for final approval.
      </p>
      <ResignationSubmitForm
        employeeId={employeeId}
        defaultNoticePeriodDays={defaultNoticePeriodDays}
        embedded
        onSuccess={() => {
          router.refresh();
          onSubmitted?.();
        }}
      />
    </div>
  );
}

function ApprovalStep({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1",
        done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "bg-background",
      )}
    >
      {label}
    </span>
  );
}
