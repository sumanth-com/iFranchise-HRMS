import { hasAnyPermission } from "@/lib/permissions/utils";
import type {
  FeedbackType,
  FeedbackVisibility,
  GoalPriority,
  GoalStatus,
  KpiAssignmentStatus,
  KpiMeasurementType,
  KpiPeriod,
  MeetingStatus,
  PromotionStatus,
  ReviewCycleStatus,
  ReviewStage,
  ReviewStatus,
} from "@/types/performance";

export const PERFORMANCE_ROUTES = {
  dashboard: "/dashboard/performance",
  goals: "/dashboard/performance/goals",
  goalDetail: (id: string) => `/dashboard/performance/goals/${id}`,
  kpis: "/dashboard/performance/kpis",
  reviews: "/dashboard/performance/reviews",
  reviewDetail: (id: string) => `/dashboard/performance/reviews/${id}`,
  feedback: "/dashboard/performance/feedback",
  oneOnOnes: "/dashboard/performance/one-on-ones",
  promotions: "/dashboard/performance/promotions",
  history: "/dashboard/performance/history",
  settings: "/dashboard/performance/settings",
} as const;

export const GOAL_PRIORITY_LABELS: Record<GoalPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  draft: "Draft",
  not_started: "Not Started",
  in_progress: "In Progress",
  on_track: "On Track",
  at_risk: "At Risk",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const REVIEW_CYCLE_STATUS_LABELS: Record<ReviewCycleStatus, string> = {
  draft: "Draft",
  active: "Active",
  closed: "Closed",
  archived: "Archived",
};

export const REVIEW_STAGE_LABELS: Record<ReviewStage, string> = {
  self: "Self Review",
  manager: "Manager Review",
  hr: "HR Review",
  final: "Final Approval",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  in_progress: "In Progress",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  appreciation: "Appreciation",
  suggestion: "Suggestion",
  coaching: "Coaching",
  warning: "Warning",
};

export const FEEDBACK_VISIBILITY_LABELS: Record<FeedbackVisibility, string> = {
  public: "Public",
  private: "Private",
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export const KPI_PERIOD_LABELS: Record<KpiPeriod, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  annual: "Yearly",
};

export const KPI_MEASUREMENT_LABELS: Record<KpiMeasurementType, string> = {
  number: "Number",
  percentage: "Percentage",
  rating: "Rating (1-5)",
  currency: "Currency",
};

export const KPI_STATUS_LABELS: Record<KpiAssignmentStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

export const KPI_SUMMARY_LABELS = {
  activeKpis: "Active KPIs",
  completedKpis: "Completed KPIs",
  overdueKpis: "Overdue KPIs",
  averageKpiCompletion: "Avg KPI Completion",
  topPerformingDepartment: "Top Department",
  employeesNeedingKpiReview: "Need Review",
} as const;

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  recommended: "Recommended",
  approved: "Approved",
  rejected: "Rejected",
  applied: "Applied",
  cancelled: "Cancelled",
};

export const REVIEW_APPROVAL_LEVEL_LABELS: Record<number, string> = {
  1: "Self Review",
  2: "Manager Review",
  3: "HR Review",
  4: "Final Approval",
};

export const PERFORMANCE_SUMMARY_LABELS = {
  activeGoals: "Active Goals",
  completedGoals: "Completed Goals",
  goalCompletionRate: "Goal Completion",
  pendingReviews: "Pending Reviews",
  completedReviews: "Completed Reviews",
  averageRating: "Average Rating",
  promotionReady: "Promotion Ready",
  feedbackCount: "Feedback Given",
  upcomingMeetings: "Upcoming 1:1s",
} as const;

export const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Below Expectations",
  3: "Meets Expectations",
  4: "Exceeds Expectations",
  5: "Outstanding",
};

const PERF_VIEW = ["performance.view"];
const PERF_CREATE = ["performance.create"];
const PERF_EDIT = ["performance.edit"];
const PERF_REVIEW = ["performance.review"];
const PERF_APPROVE = ["performance.approve"];
const PERF_FEEDBACK = ["performance.feedback"];
const PERF_SETTINGS = ["performance.settings"];

export function canViewPerformance(codes: string[]) {
  return hasAnyPermission(codes, PERF_VIEW);
}

export function canCreatePerformance(codes: string[]) {
  return hasAnyPermission(codes, PERF_CREATE);
}

export function canEditPerformance(codes: string[]) {
  return hasAnyPermission(codes, PERF_EDIT);
}

export function canReviewPerformance(codes: string[]) {
  return hasAnyPermission(codes, PERF_REVIEW);
}

export function canApprovePerformance(codes: string[]) {
  return hasAnyPermission(codes, PERF_APPROVE);
}

export function canGiveFeedback(codes: string[]) {
  return hasAnyPermission(codes, PERF_FEEDBACK);
}

const KPI_VIEW = ["kpi.view", "performance.view"];
const KPI_MANAGE = ["kpi.manage", "performance.create", "performance.settings"];
const KPI_PROGRESS = ["kpi.progress", "performance.edit", "performance.review"];

export function canViewKpis(codes: string[]) {
  return hasAnyPermission(codes, KPI_VIEW);
}

export function canManageKpis(codes: string[]) {
  return hasAnyPermission(codes, KPI_MANAGE);
}

export function canUpdateKpiProgress(codes: string[]) {
  return hasAnyPermission(codes, KPI_PROGRESS);
}

export function canViewAllKpis(codes: string[]) {
  return hasAnyPermission(codes, KPI_MANAGE);
}

export function canManageKpiTemplates(codes: string[]) {
  return hasAnyPermission(codes, KPI_MANAGE);
}

export function canAssignKpis(codes: string[]) {
  return hasAnyPermission(codes, KPI_MANAGE);
}

export function canManagePerformanceSettings(codes: string[]) {
  return hasAnyPermission(codes, PERF_SETTINGS);
}

export const PERFORMANCE_SUB_NAV = [
  { title: "Dashboard", href: PERFORMANCE_ROUTES.dashboard },
  { title: "Goals & OKRs", href: PERFORMANCE_ROUTES.goals },
  { title: "KPIs", href: PERFORMANCE_ROUTES.kpis },
  { title: "Reviews", href: PERFORMANCE_ROUTES.reviews },
  { title: "Feedback", href: PERFORMANCE_ROUTES.feedback },
  { title: "1:1 Meetings", href: PERFORMANCE_ROUTES.oneOnOnes },
  { title: "Promotions", href: PERFORMANCE_ROUTES.promotions },
  { title: "History", href: PERFORMANCE_ROUTES.history },
  { title: "Settings", href: PERFORMANCE_ROUTES.settings },
] as const;
