import type {
  FeedbackListItem,
  GoalListItem,
  OneOnOneListItem,
  PromotionListItem,
  ReviewDetail,
  ReviewStatus,
} from "@/types/performance";
import type { LookupOption } from "@/types/employee";

export type CompetencyKey =
  | "communication"
  | "technicalSkills"
  | "ownership"
  | "teamwork"
  | "problemSolving"
  | "leadership"
  | "discipline"
  | "innovation";

export type CompetencyRatings = Partial<Record<CompetencyKey, number>>;

export type TeamPerformanceListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  employeeId?: string;
  departmentId?: string;
  cycleId?: string;
  reviewStatus?: ReviewStatus;
  minRating?: number;
  sortBy?: "employee_code" | "current_rating" | "last_review";
  sortOrder?: "asc" | "desc";
};

export type TeamPerformanceSummary = {
  teamAverageRating: number;
  reviewsPending: number;
  reviewsCompleted: number;
  goalsAtRisk: number;
  highPerformers: number;
  employeesNeedingAttention: number;
};

export type TeamPerformanceRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designationTitle: string | null;
  departmentName: string | null;
  currentRating: number | null;
  goalsCompleted: number;
  pendingGoals: number;
  goalsAtRisk: number;
  reviewStatus: ReviewStatus | null;
  reviewId: string | null;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  needsAttention: boolean;
  isHighPerformer: boolean;
};

export type TeamPerformanceListResult = {
  data: TeamPerformanceRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type TeamPerformanceFilterLookups = {
  departments: LookupOption[];
  cycles: LookupOption[];
  employees: LookupOption[];
  designations: LookupOption[];
};

export type TeamPerformanceTrendPoint = {
  month: string;
  averageRating: number;
  goalCompletionRate: number;
  reviewsCompleted: number;
};

export type TeamEmployeePerformanceProfile = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  managerName: string | null;
  dateOfJoining: string | null;
  currentRating: number | null;
  historicalRatings: Array<{
    reviewId: string;
    cycleName: string | null;
    rating: number | null;
    reviewStatus: ReviewStatus;
    submittedAt: string | null;
  }>;
  goals: GoalListItem[];
  achievements: string[];
  improvementAreas: string[];
  feedback: FeedbackListItem[];
  oneOnOnes: OneOnOneListItem[];
  promotions: PromotionListItem[];
  activeReview: ReviewDetail | null;
  trends: TeamPerformanceTrendPoint[];
};

export type ManagerTeamPerformancePageData = {
  summary: TeamPerformanceSummary;
  records: TeamPerformanceListResult;
  lookups: TeamPerformanceFilterLookups;
  trends: TeamPerformanceTrendPoint[];
};
