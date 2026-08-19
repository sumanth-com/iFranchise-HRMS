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
import { SuccessCelebrationOverlay } from "@/components/common/success-celebration-overlay";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import { buildStatusItems } from "@/components/performance/performance-filters";
import {
  GoalPriorityBadge,
  GoalStatusBadge,
} from "@/components/performance/performance-status-badge";
import {
  DetailField,
  DetailGrid,
  PerformanceSection,
} from "@/components/performance/performance-ui-primitives";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import {
  addGoalCommentAction,
  fetchGoalDetailAction,
  toggleGoalMilestoneAction,
  updateGoalAction,
  updateGoalProgressAction,
} from "@/lib/performance/actions";
import { GOAL_PRIORITY_LABELS, GOAL_STATUS_LABELS } from "@/lib/performance/constants";
import type { GoalDetail, GoalPriority, GoalStatus } from "@/types/performance";

const statusItems = buildStatusItems(GOAL_STATUS_LABELS);
const priorityItems = toSelectItems(GOAL_PRIORITY_LABELS);

type MilestoneToggleInput = {
  goalId: string;
  milestoneId: string;
  isCompleted: boolean;
};

type Props = {
  goalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  /** HR assigner history: read-only summary. Employee: own goals with key-result updates. */
  variant?: "default" | "assigner" | "employee";
  fetchDetail?: (goalId: string) => Promise<GoalDetail | null>;
  toggleMilestone?: (input: MilestoneToggleInput) => Promise<{
    success: boolean;
    message?: string;
    data?: {
      goalStatus: GoalStatus;
      currentProgress: number;
      completedMilestones: number;
      milestoneCount: number;
      completedNow: boolean;
    };
  }>;
  canManage?: boolean;
  categories?: string[];
  onChanged?: (patch?: {
    goalId: string;
    goalStatus: GoalStatus;
    currentProgress: number;
    completedMilestones: number;
    milestoneCount: number;
  }) => void;
  /** Assigner edit opens the form. View stays read-only. */
  mode?: "view" | "edit";
};

export function GoalDetailModal({
  goalId,
  open,
  onOpenChange,
  canEdit = false,
  variant = "default",
  fetchDetail = fetchGoalDetailAction,
  toggleMilestone,
  canManage = false,
  categories = [],
  onChanged,
  mode = "view",
}: Props) {
  const router = useRouter();
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    goalPriority: "medium" as GoalPriority,
    weightage: 0,
    dueDate: "",
    goalStatus: "not_started" as GoalStatus,
  });
  const [isPending, startTransition] = useTransition();
  const [congrats, setCongrats] = useState<{ title: string; description: string } | null>(
    null,
  );

  const isAssigner = variant === "assigner";
  const isEmployee = variant === "employee";
  const showProgressControls = variant === "default" && canEdit;
  const showComments = variant === "default" && canEdit;
  const canToggleMilestones =
    (isEmployee && canEdit) || (variant === "default" && canEdit);

  useEffect(() => {
    if (!open || !goalId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchDetail(goalId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      if (data) {
        setEditForm({
          title: data.title,
          description: data.description ?? "",
          category: data.category ?? "",
          goalPriority: data.goalPriority,
          weightage: data.weightage,
          dueDate: data.dueDate ?? "",
          goalStatus: data.goalStatus,
        });
      }
      setEditing(mode === "edit" && variant === "assigner");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, goalId, fetchDetail, mode, variant]);

  function refreshDetail() {
    if (!goalId) return;
    fetchDetail(goalId).then((data) => {
      setDetail(data);
      if (data) {
        setEditForm({
          title: data.title,
          description: data.description ?? "",
          category: data.category ?? "",
          goalPriority: data.goalPriority,
          weightage: data.weightage,
          dueDate: data.dueDate ?? "",
          goalStatus: data.goalStatus,
        });
      }
      router.refresh();
      onChanged?.();
    });
  }

  function handleToggleMilestone(milestoneId: string, isCompleted: boolean) {
    if (!goalId || !detail) return;
    startTransition(async () => {
      const toggleFn = toggleMilestone ?? toggleGoalMilestoneAction;
      const result = await toggleFn({
        goalId: detail.id,
        milestoneId,
        isCompleted,
      });
      if (!result.success) {
        toast.error(result.message ?? "Failed to update key result");
        return;
      }
      const snapshot = result.data;
      setDetail((prev) => {
        if (!prev) return prev;
        const milestones = prev.milestones.map((item) =>
          item.id === milestoneId
            ? {
                ...item,
                isCompleted,
                completedAt: isCompleted ? new Date().toISOString() : null,
              }
            : item,
        );
        return {
          ...prev,
          milestones,
          goalStatus: (snapshot?.goalStatus as typeof prev.goalStatus) ?? prev.goalStatus,
          currentProgress: snapshot?.currentProgress ?? prev.currentProgress,
          completedMilestones:
            snapshot?.completedMilestones ??
            milestones.filter((item) => item.isCompleted).length,
          milestoneCount: snapshot?.milestoneCount ?? milestones.length,
        };
      });
      if (snapshot) {
        onChanged?.({
          goalId: detail.id,
          goalStatus: snapshot.goalStatus as GoalStatus,
          currentProgress: snapshot.currentProgress,
          completedMilestones: snapshot.completedMilestones,
          milestoneCount: snapshot.milestoneCount,
        });
      } else {
        onChanged?.();
      }
      if (snapshot?.completedNow) {
        setCongrats({
          title: "Congratulations!",
          description: `You finished every key result on ${detail.title}.`,
        });
      }
    });
  }

  function saveEdit() {
    if (!detail) return;
    startTransition(async () => {
      const result = await updateGoalAction({
        goalId: detail.id,
        employeeId: detail.employeeId,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        category: editForm.category || undefined,
        goalPriority: editForm.goalPriority,
        weightage: editForm.weightage,
        dueDate: editForm.dueDate || null,
        goalStatus: editForm.goalStatus,
        currentProgress: detail.currentProgress,
        milestones: [],
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Goal updated");
      setEditing(false);
      onOpenChange(false);
      onChanged?.();
      router.refresh();
    });
  }

  function markComplete() {
    if (!goalId) return;
    startTransition(async () => {
      const result = await updateGoalProgressAction({
        goalId,
        currentProgress: 100,
        goalStatus: "completed",
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Goal marked complete");
      setConfirmComplete(false);
      refreshDetail();
    });
  }

  const categoryItems =
    categories.length > 0
      ? categories.map((c) => ({ value: c, label: c }))
      : [{ value: "General", label: "General" }];

  const modalTitle = editing ? "Edit goal" : detail?.title ?? "Goal details";
  const modalDescription = isEmployee
    ? detail?.category
      ? `${detail.category} goal`
      : "Your assigned goal"
    : detail
      ? `${detail.employeeName} · ${detail.departmentName ?? "No department"}`
      : "Loading goal information";

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={modalTitle}
        description={modalDescription}
        contentClassName="sm:max-w-2xl"
        showCancel={false}
        footer={
          isAssigner && canManage && mode === "edit" && detail ? (
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={isPending} onClick={saveEdit}>
                {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )
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
              {variant === "default" ? (
                <GoalPriorityBadge priority={detail.goalPriority} />
              ) : null}
            </div>

            <PerformanceSection title="Details">
              {editing && isAssigner ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Goal title</Label>
                    <Input
                      value={editForm.title}
                      disabled={isPending}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Description</Label>
                    <textarea
                      className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editForm.description}
                      disabled={isPending}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <LabeledSelect
                      items={categoryItems}
                      value={editForm.category}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}
                      disabled={isPending}
                      triggerClassName="h-9 w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Priority</Label>
                    <LabeledSelect
                      items={priorityItems}
                      value={editForm.goalPriority}
                      onValueChange={(v) =>
                        setEditForm((f) => ({ ...f, goalPriority: v as GoalPriority }))
                      }
                      disabled={isPending}
                      triggerClassName="h-9 w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Weight %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.weightage}
                      disabled={isPending}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, weightage: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due date</Label>
                    <Input
                      type="date"
                      value={editForm.dueDate}
                      disabled={isPending}
                      onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Status</Label>
                    <LabeledSelect
                      items={statusItems.filter((item) => item.value !== "all")}
                      value={editForm.goalStatus}
                      onValueChange={(v) =>
                        setEditForm((f) => ({ ...f, goalStatus: v as GoalStatus }))
                      }
                      disabled={isPending}
                      triggerClassName="h-9 w-full"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <DetailGrid>
                    {!isEmployee ? (
                      <>
                        <DetailField label="Employee" value={detail.employeeName} />
                        <DetailField label="Employee code" value={detail.employeeCode} />
                      </>
                    ) : null}
                    <DetailField label="Category" value={detail.category ?? "—"} />
                    <DetailField
                      label="Priority"
                      value={GOAL_PRIORITY_LABELS[detail.goalPriority]}
                    />
                    <DetailField label="Weightage" value={`${detail.weightage}%`} />
                    <DetailField
                      label="Due date"
                      value={
                        detail.dueDate ? format(new Date(detail.dueDate), "MMM d, yyyy") : "—"
                      }
                    />
                    {!isAssigner && !isEmployee ? (
                      <DetailField label="Review cycle" value={detail.cycleName ?? "—"} />
                    ) : null}
                    <DetailField
                      label="Assigned on"
                      value={format(new Date(detail.createdAt), "MMM d, yyyy")}
                    />
                  </DetailGrid>
                  {detail.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {detail.description}
                    </p>
                  ) : null}
                </>
              )}
            </PerformanceSection>

            <PerformanceSection
              title="Key results"
              description={
                isEmployee
                  ? "Mark key results as you complete them."
                  : "Milestones linked to this goal."
              }
            >
              {detail.milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No key results defined.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.milestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{milestone.title}</p>
                        {milestone.dueDate ? (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(milestone.dueDate), "MMM d, yyyy")}
                          </p>
                        ) : null}
                      </div>
                      {canToggleMilestones ? (
                        <Button
                          size="sm"
                          variant={milestone.isCompleted ? "default" : "outline"}
                          disabled={isPending}
                          onClick={() =>
                            handleToggleMilestone(milestone.id, !milestone.isCompleted)
                          }
                        >
                          <Check className="size-3.5" />
                        </Button>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {milestone.isCompleted ? "Done" : "Open"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </PerformanceSection>

            {showProgressControls ? (
              <PerformanceSection title="Progress management">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => setConfirmComplete(true)}
                  >
                    Mark complete
                  </Button>
                </div>
              </PerformanceSection>
            ) : null}

            {showComments ? (
              <PerformanceSection title="Comments">
                <EmployeeGoalComments goalId={detail.id} isPending={isPending} onAdded={refreshDetail} />
              </PerformanceSection>
            ) : null}

            {variant === "default" && detail.comments.length > 0 ? (
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
          </div>
        )}
      </Modal>

      <PerformanceConfirmModal
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title="Mark goal complete?"
        description="This will set status to completed."
        confirmLabel="Mark complete"
        isPending={isPending}
        onConfirm={markComplete}
      />

      <SuccessCelebrationOverlay
        open={Boolean(congrats)}
        title={congrats?.title ?? "Congratulations!"}
        description={congrats?.description}
        durationMs={3200}
        onClose={() => setCongrats(null)}
      />
    </>
  );
}

function EmployeeGoalComments({
  goalId,
  isPending: parentPending,
  onAdded,
}: {
  goalId: string;
  isPending: boolean;
  onAdded: () => void;
}) {
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <textarea
        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        placeholder="Add a note about this goal…"
        value={comment}
        disabled={isPending || parentPending}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        size="sm"
        disabled={isPending || parentPending || !comment.trim()}
        onClick={() => {
          startTransition(async () => {
            const result = await addGoalCommentAction({
              goalId,
              comment: comment.trim(),
            });
            if (!result.success) toast.error(result.message);
            else {
              setComment("");
              toast.success("Comment added");
              onAdded();
            }
          });
        }}
      >
        Add comment
      </Button>
    </div>
  );
}
