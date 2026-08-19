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
import { getKpiRowStatusDisplay } from "@/lib/performance/kpi-update-options";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200/80 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25",
  not_started: "bg-violet-50 text-violet-700 ring-violet-200/80 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
  pending: "bg-amber-50 text-amber-700 ring-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25",
  in_progress: "bg-sky-50 text-sky-700 ring-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  on_track: "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  at_risk: "bg-orange-50 text-orange-700 ring-orange-200/80 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/25",
  submitted: "bg-violet-50 text-violet-700 ring-violet-200/80 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200/80 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200/80 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25",
  scheduled: "bg-sky-50 text-sky-700 ring-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
  recommended: "bg-violet-50 text-violet-700 ring-violet-200/80 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25",
  overdue: "bg-rose-50 text-rose-700 ring-rose-200/80 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
  applied: "bg-indigo-50 text-indigo-700 ring-indigo-200/80 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 ring-1 ring-inset",
        STATUS_STYLES[status] ??
          "bg-slate-100 text-slate-600 ring-slate-200/80 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25",
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
  return <PerformanceStatusBadge label={KPI_STATUS_LABELS[status]} status={status} />;
}

export function KpiRowStatusBadge({
  kpiStatus,
  progressComments,
}: {
  kpiStatus: KpiAssignmentStatus;
  progressComments: string | null;
}) {
  const display = getKpiRowStatusDisplay({ kpiStatus, progressComments });
  return <PerformanceStatusBadge label={display.label} status={display.statusKey} />;
}
