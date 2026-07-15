import type { LookupOption } from "@/types/employee";
import type { PromotionStatus, ReviewStatus } from "@/types/performance";

export type CeoPerformanceListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  managerId?: string;
  cycleId?: string;
  rating?: number;
  employmentTypeId?: string;
};

export type CeoPerformanceKpis = {
  companyAverageRating: number;
  completedReviews: number;
  pendingReviews: number;
  promotionRecommendations: number;
  employeesOnPip: number;
  highPerformers: number;
  averageGoalCompletion: number;
  performanceIndex: number;
};

export type CeoPerformanceOverview = {
  overallCompanyRating: number;
  quarterlyPerformanceScore: number;
  yearlyTrend: { label: string; value: number }[];
  averageKpiAchievement: number;
  goalCompletionPercentage: number;
};

export type CeoPerformanceDepartmentRow = {
  id: string;
  name: string;
  headName: string | null;
  employeeCount: number;
  averageRating: number | null;
  goalCompletionPercent: number;
  pendingReviews: number;
  promotionEligible: number;
  performanceTrend: "up" | "down" | "flat" | "unknown";
  trendDelta: number | null;
};

export type CeoPerformanceEmployeeRow = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  departmentId: string | null;
  departmentName: string | null;
  managerId: string | null;
  managerName: string | null;
  currentRating: number | null;
  previousRating: number | null;
  goalCompletionPercent: number;
  reviewStatus: ReviewStatus | null;
  promotionStatus: PromotionStatus | null;
  onPip: boolean;
  profileImagePath: string | null;
};

export type CeoPerformanceEmployeeListResult = {
  data: CeoPerformanceEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoPerformanceTopPerformers = {
  topEmployees: { id: string; label: string; value: number; meta: string }[];
  topManagers: { id: string; label: string; value: number; meta: string }[];
  topDepartments: { id: string; label: string; value: number }[];
  highestGoalAchievement: { id: string; label: string; value: number }[];
  highestRatedTeams: { id: string; label: string; value: number }[];
};

export type CeoPerformanceLowPerformance = {
  employeesOnPip: { id: string; label: string; meta: string }[];
  departmentsBelowTarget: { id: string; label: string; value: number }[];
  managersRequiringAttention: { id: string; label: string; value: number; meta: string }[];
  pendingReviews: { id: string; label: string; meta: string }[];
  reviewDelays: { id: string; label: string; meta: string }[];
};

export type CeoPerformanceInsights = {
  performanceDistribution: { label: string; value: number }[];
  ratingDistribution: { label: string; value: number }[];
  departmentComparison: { label: string; value: number }[];
  managerComparison: { label: string; value: number }[];
  goalAchievement: { label: string; value: number }[];
  promotionReadiness: { label: string; value: number }[];
  trainingRequirementSummary: { label: string; value: number }[];
  skillGapOverview: { label: string; value: number }[];
};

export type CeoPerformancePromotionOverview = {
  recommendations: number;
  approved: number;
  pending: number;
  rejected: number;
  pipeline: { label: string; value: number }[];
};

export type CeoPerformanceFilterLookups = {
  departments: LookupOption[];
  managers: LookupOption[];
  cycles: LookupOption[];
  employmentTypes: LookupOption[];
};

export type CeoPerformanceEmployeeDetail = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  managerName: string | null;
  profileImagePath: string | null;
  currentStatus: string;
  currentRating: number | null;
  onPip: boolean;
  timeline: { id: string; title: string; description: string | null; createdAt: string }[];
  quarterRatings: { label: string; value: number | null }[];
  yearlyRatings: { label: string; value: number | null }[];
  goals: {
    id: string;
    title: string;
    progress: number;
    status: string;
    dueDate: string | null;
  }[];
  achievements: string[];
  skills: { label: string; value: number }[];
  strengths: string[];
  improvementAreas: string[];
  managerFeedback: {
    id: string;
    fromName: string;
    message: string;
    feedbackType: string;
    createdAt: string;
  }[];
  promotionHistory: {
    id: string;
    fromTitle: string | null;
    toTitle: string | null;
    status: PromotionStatus;
    createdAt: string;
  }[];
  trainingHistory: { id: string; title: string; description: string | null; createdAt: string }[];
  awards: { id: string; title: string; amount: number | null; awardedAt: string }[];
};

export type CeoPerformancePageData = {
  kpis: CeoPerformanceKpis;
  overview: CeoPerformanceOverview;
  departments: CeoPerformanceDepartmentRow[];
  employees: CeoPerformanceEmployeeListResult;
  topPerformers: CeoPerformanceTopPerformers;
  lowPerformance: CeoPerformanceLowPerformance;
  insights: CeoPerformanceInsights;
  promotions: CeoPerformancePromotionOverview;
  lookups: CeoPerformanceFilterLookups;
};
