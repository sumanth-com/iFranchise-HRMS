"use client";

import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import {
  GoalPriorityBadge,
  GoalStatusBadge,
} from "@/components/performance/performance-status-badge";
import {
  DetailField,
  DetailGrid,
  PerformanceSection,
  ProgressBar,
} from "@/components/performance/performance-ui-primitives";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import {
  addGoalCommentAction,
  fetchGoalDetailAction,
  toggleGoalMilestoneAction,
  updateGoalProgressAction,
} from "@/lib/performance/actions";
import { GOAL_STATUS_LABELS } from "@/lib/performance/constants";
import type { GoalDetail } from "@/types/performance";

const statusItems = toSelectItems(GOAL_STATUS_LABELS);

type Props = {
  goalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
};

export function GoalDetailModal({ goalId, open, onOpenChange, canEdit = false }: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("not_started");
  const [comment, setComment] = useState("");
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !goalId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchGoalDetailAction(goalId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      if (data) {
        setProgress(data.currentProgress);
        setStatus(data.goalStatus);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, goalId]);

  function refreshDetail() {
    if (!goalId) return;
    fetchGoalDetailAction(goalId).then((data) => {
      setDetail(data);
      if (data) {
        setProgress(data.currentProgress);
        setStatus(data.goalStatus);
      }
      router.refresh();
    });
  }

  function saveProgress(markComplete = false) {
    if (!goalId) return;
    startTransition(async () => {
      const result = await updateGoalProgressAction({
        goalId,
        currentProgress: markComplete ? 100 : progress,
        goalStatus: markComplete ? "completed" : status,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(markComplete ? "Goal marked complete" : "Progress updated");
      setConfirmComplete(false);
      refreshDetail();
    });
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={detail?.title ?? "Goal details"}
        description={
          detail
            ? `${detail.employeeName} · ${detail.departmentName ?? "No department"}`
            : "Loading goal information"
        }
        contentClassName="sm:max-w-2xl"
        showCancel={false}
        footer={
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading goal…
          </div>
        ) : !detail ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Goal not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <GoalStatusBadge status={detail.goalStatus} />
              <GoalPriorityBadge priority={detail.goalPriority} />
            </div>

            <PerformanceSection title="Overview">
              <DetailGrid>
                <DetailField label="Employee" value={detail.employeeName} />
                <DetailField label="Employee code" value={detail.employeeCode} />
                <DetailField label="Cycle" value={detail.cycleName ?? "—"} />
                <DetailField
                  label="Due date"
                  value={
                    detail.dueDate ? format(new Date(detail.dueDate), "MMM d, yyyy") : "—"
                  }
                />
                <DetailField label="Category" value={detail.category ?? "—"} />
                <DetailField label="Weightage" value={`${detail.weightage}%`} />
              </DetailGrid>
              {detail.description ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </p>
              ) : null}
            </PerformanceSection>

            <PerformanceSection title="Progress">
              <ProgressBar value={detail.currentProgress} />
              {canEdit ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Progress %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={progress}
                      disabled={isPending}
                      onChange={(e) => setProgress(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <LabeledSelect
                      items={statusItems}
                      value={status}
                      onValueChange={setStatus}
                      disabled={isPending}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => saveProgress(false)}
                    >
                      {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Save progress
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => setConfirmComplete(true)}
                    >
                      Mark complete
                    </Button>
                  </div>
                </div>
              ) : null}
            </PerformanceSection>

            <PerformanceSection
              title="Key results"
              description="Track milestone completion for this objective."
            >
              {detail.milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No key results defined.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.milestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{milestone.title}</p>
                        {milestone.dueDate ? (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(milestone.dueDate), "MMM d, yyyy")}
                          </p>
                        ) : null}
                      </div>
                      {canEdit ? (
                        <Button
                          size="sm"
                          variant={milestone.isCompleted ? "default" : "outline"}
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await toggleGoalMilestoneAction({
                                goalId: detail.id,
                                milestoneId: milestone.id,
                                isCompleted: !milestone.isCompleted,
                              });
                              if (!result.success) toast.error(result.message);
                              else refreshDetail();
                            })
                          }
                        >
                          <Check className="size-3.5" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {milestone.isCompleted ? "Done" : "Open"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </PerformanceSection>

            {canEdit ? (
              <PerformanceSection title="Add comment">
                <div className="space-y-2">
                  <Input
                    placeholder="Add a note about this goal…"
                    value={comment}
                    disabled={isPending}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={isPending || !comment.trim()}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await addGoalCommentAction({
                          goalId: detail.id,
                          comment: comment.trim(),
                        });
                        if (!result.success) toast.error(result.message);
                        else {
                          setComment("");
                          toast.success("Comment added");
                          refreshDetail();
                        }
                      })
                    }
                  >
                    Add comment
                  </Button>
                </div>
              </PerformanceSection>
            ) : null}

            {detail.comments.length > 0 ? (
              <PerformanceSection title="Activity">
                <ul className="space-y-3">
                  {detail.comments.map((c) => (
                    <li key={c.id} className="rounded-md border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        {c.authorName} · {format(new Date(c.createdAt), "MMM d, yyyy")}
                      </p>
                      <p className="mt-1 text-sm">{c.comment}</p>
                    </li>
                  ))}
                </ul>
              </PerformanceSection>
            ) : null}

            <DetailGrid columns={1}>
              <DetailField
                label="Created"
                value={format(new Date(detail.createdAt), "MMM d, yyyy")}
              />
            </DetailGrid>
          </div>
        )}
      </Modal>

      <PerformanceConfirmModal
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title="Mark goal complete?"
        description="This will set progress to 100% and status to completed."
        confirmLabel="Mark complete"
        isPending={isPending}
        onConfirm={() => saveProgress(true)}
      />
    </>
  );
}
