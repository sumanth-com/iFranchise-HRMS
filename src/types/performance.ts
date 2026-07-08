import type { LookupOption } from "@/types/employee";

export type GoalPriority = "low" | "medium" | "high" | "critical";
export type GoalStatus =
  | "draft"
  | "not_started"
  | "in_progress"
  | "on_track"
  | "at_risk"
  | "completed"
  | "cancelled";

export type ReviewCycleStatus = "draft" | "active" | "closed" | "archived";
export type ReviewStage = "self" | "manager" | "hr" | "final";
export type ReviewStatus =
  | "draft"
  | "pending"
  | "in_progress"
  | "submitted"
  | "approved"
  | "rejected";

export type FeedbackType = "appreciation" | "suggestion" | "coaching" | "warning";
export type FeedbackVisibility = "public" | "private";
export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";
export type KpiPeriod = "monthly" | "quarterly" | "half_yearly" | "annual";
export type KpiMeasurementType = "number" | "percentage" | "rating" | "currency";
export type KpiAssignmentStatus = "not_started" | "in_progress" | "completed" | "overdue";
export type PromotionStatus =
  | "draft"
  | "pending"
  | "recommended"
  | "approved"
  | "rejected"
  | "applied"
  | "cancelled";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "skipped";

export type PerformanceActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };

export type PerformanceLookups = {
  employees: LookupOption[];
  departments: LookupOption[];
  designations: LookupOption[];
  cycles: LookupOption[];
};

export type PerformanceSummary = {
  activeGoals: number;
  completedGoals: number;
  goalCompletionRate: number;
  pendingReviews: number;
  completedReviews: number;
  averageRating: number;
  promotionReady: number;
  feedbackCount: number;
  upcomingMeetings: number;
  departmentPerformance: DepartmentPerformanceItem[];
  reviewStatusBreakdown: ReviewStatusBreakdownItem[];
  goalProgressByMonth: GoalProgressItem[];
  activeKpis: number;
  completedKpis: number;
  overdueKpis: number;
  averageKpiCompletion: number;
  topPerformingDepartment: string | null;
  employeesNeedingKpiReview: number;
  kpiDepartmentPerformance: DepartmentPerformanceItem[];
};

export type DepartmentPerformanceItem = {
  departmentId: string;
  departmentName: string;
  averageProgress: number;
  goalCount: number;
};

export type ReviewStatusBreakdownItem = {
  status: ReviewStatus;
  count: number;
};

export type GoalProgressItem = {
  month: string;
  completed: number;
  total: number;
};

export type ReviewCycleItem = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  cycleStatus: ReviewCycleStatus;
  isActive: boolean;
  createdAt: string;
};

export type GoalListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  cycleId: string | null;
  cycleName: string | null;
  title: string;
  description: string | null;
  category: string | null;
  goalPriority: GoalPriority;
  weightage: number;
  currentProgress: number;
  dueDate: string | null;
  goalStatus: GoalStatus;
  attachmentPath: string | null;
  milestoneCount: number;
  completedMilestones: number;
  createdAt: string;
};

export type GoalListResult = {
  data: GoalListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type GoalMilestone = {
  id: string;
  title: string;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
};

export type GoalComment = {
  id: string;
  authorName: string;
  comment: string;
  createdAt: string;
};

export type GoalDetail = GoalListItem & {
  milestones: GoalMilestone[];
  comments: GoalComment[];
};

export type KpiTemplateItem = {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationTitle: string | null;
  measurementType: KpiMeasurementType;
  weightage: number;
  kpiPeriod: KpiPeriod;
  targetValue: number | null;
  isActive: boolean;
  createdAt: string;
};

export type KpiListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  designationTitle: string | null;
  templateId: string | null;
  title: string;
  measurementType: KpiMeasurementType;
  weightage: number;
  targetValue: number | null;
  currentValue: number;
  completionPercentage: number;
  kpiStatus: KpiAssignmentStatus;
  kpiPeriod: KpiPeriod;
  startDate: string | null;
  endDate: string | null;
  managerName: string | null;
  managerEmployeeId: string | null;
  progressComments: string | null;
  evidenceNotes: string | null;
  templateName: string | null;
  createdAt: string;
};

export type KpiListResult = {
  data: KpiListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ReviewListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  cycleId: string | null;
  cycleName: string | null;
  reviewStage: ReviewStage;
  reviewStatus: ReviewStatus;
  overallRating: number | null;
  reviewerName: string | null;
  submittedAt: string | null;
  createdAt: string;
};

export type ReviewListResult = {
  data: ReviewListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ReviewApproval = {
  id: string;
  approvalLevel: number;
  reviewStage: ReviewStage;
  approvalStatus: ApprovalStatus;
  approverName: string;
  comments: string | null;
  actedAt: string | null;
};

export type ReviewDetail = ReviewListItem & {
  comments: string | null;
  strengths: string | null;
  weaknesses: string | null;
  improvementPlan: string | null;
  approvals: ReviewApproval[];
};

export type FeedbackListItem = {
  id: string;
  fromEmployeeName: string;
  toEmployeeName: string;
  toEmployeeId: string;
  feedbackType: FeedbackType;
  visibility: FeedbackVisibility;
  message: string;
  createdAt: string;
};

export type FeedbackListResult = {
  data: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type OneOnOneListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  managerName: string;
  scheduledAt: string;
  agenda: string | null;
  notes: string | null;
  followUpDate: string | null;
  meetingStatus: MeetingStatus;
  actionItemCount: number;
  completedActions: number;
  createdAt: string;
};

export type OneOnOneListResult = {
  data: OneOnOneListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type OneOnOneActionItem = {
  id: string;
  title: string;
  assignedToName: string | null;
  dueDate: string | null;
  isCompleted: boolean;
};

export type PromotionListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string | null;
  currentDesignation: string | null;
  recommendedDesignation: string | null;
  currentSalary: number | null;
  recommendedSalary: number | null;
  promotionStatus: PromotionStatus;
  recommendedByName: string | null;
  approverName: string | null;
  reason: string | null;
  createdAt: string;
};

export type PromotionListResult = {
  data: PromotionListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type HistoryEventType =
  | "review"
  | "promotion"
  | "feedback"
  | "goal"
  | "salary_revision"
  | "bonus";

export type HistoryEvent = {
  id: string;
  eventType: HistoryEventType;
  title: string;
  description: string | null;
  employeeId: string;
  employeeName: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type HistoryListResult = {
  data: HistoryEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export type PerformanceSettingsData = {
  reviewCycles: {
    defaultDurationMonths: number;
    selfReviewDays: number;
    managerReviewDays: number;
  };
  ratingScale: {
    min: number;
    max: number;
    labels: Record<string, string>;
  };
  goalCategories: string[];
  kpiTemplates: string[];
  promotionRules: {
    minRatingForPromotion: number;
    minTenureMonths: number;
    requireManagerApproval: boolean;
    requireHrApproval: boolean;
  };
  notifications: {
    reviewReminder: boolean;
    goalDueReminder: boolean;
    feedbackNotification: boolean;
    promotionNotification: boolean;
    oneOnOneReminder: boolean;
  };
};

export type PerformanceSettingsRecord = {
  settings: PerformanceSettingsData;
  audit: {
    createdAt: string;
    updatedAt: string;
    createdByName: string | null;
    updatedByName: string | null;
  };
};
