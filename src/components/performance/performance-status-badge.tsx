import type {
  FeedbackType,
  FeedbackVisibility,
  GoalPriority,
  GoalStatus,
  MeetingStatus,
  PromotionStatus,
  ReviewStage,
  ReviewStatus,
} from "@/types/performance";
import {
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_VISIBILITY_LABELS,
  GOAL_PRIORITY_LABELS,
  GOAL_STATUS_LABELS,
  MEETING_STATUS_LABELS,
  KPI_STATUS_LABELS,
  PROMOTION_STATUS_LABELS,
  REVIEW_STAGE_LABELS,
  REVIEW_STATUS_LABELS,
} from "@/lib/performance/constants";
import type { KpiAssignmentStatus } from "@/types/performance";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  on_track: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  at_risk: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  submitted: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  recommended: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  applied: "bg-primary/10 text-primary",
};

export function PerformanceStatusBadge({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <PerformanceStatusBadge label={GOAL_STATUS_LABELS[status]} status={status} />;
}

export function GoalPriorityBadge({ priority }: { priority: GoalPriority }) {
  return <PerformanceStatusBadge label={GOAL_PRIORITY_LABELS[priority]} status={priority === "critical" ? "at_risk" : priority === "high" ? "pending" : "on_track"} />;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <PerformanceStatusBadge label={REVIEW_STATUS_LABELS[status]} status={status} />;
}

export function ReviewStageBadge({ stage }: { stage: ReviewStage }) {
  return <PerformanceStatusBadge label={REVIEW_STAGE_LABELS[stage]} status={stage === "final" ? "approved" : "in_progress"} />;
}

export function FeedbackTypeBadge({ type }: { type: FeedbackType }) {
  const style =
    type === "warning" ? "rejected" : type === "appreciation" ? "approved" : "in_progress";
  return <PerformanceStatusBadge label={FEEDBACK_TYPE_LABELS[type]} status={style} />;
}

export function FeedbackVisibilityBadge({ visibility }: { visibility: FeedbackVisibility }) {
  return <PerformanceStatusBadge label={FEEDBACK_VISIBILITY_LABELS[visibility]} status={visibility === "public" ? "on_track" : "draft"} />;
}

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return <PerformanceStatusBadge label={MEETING_STATUS_LABELS[status]} status={status} />;
}

export function PromotionStatusBadge({ status }: { status: PromotionStatus }) {
  return <PerformanceStatusBadge label={PROMOTION_STATUS_LABELS[status]} status={status} />;
}

export function KpiStatusBadge({ status }: { status: KpiAssignmentStatus }) {
  const style =
    status === "completed"
      ? "approved"
      : status === "overdue"
        ? "rejected"
        : status === "in_progress"
          ? "in_progress"
          : "draft";
  return <PerformanceStatusBadge label={KPI_STATUS_LABELS[status]} status={style} />;
}
