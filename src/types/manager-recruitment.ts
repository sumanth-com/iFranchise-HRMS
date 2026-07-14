import type {
  CandidateStage,
  InterviewListItem,
  InterviewMeetingType,
  InterviewRecommendation,
  InterviewStatus,
  JobOpeningStatus,
  OfferListItem,
  OfferStatus,
  TimelineItem,
} from "@/types/recruitment";

export type TeamRecruitmentSummary = {
  openPositions: number;
  candidatesAssigned: number;
  interviewsToday: number;
  pendingFeedback: number;
  offersAwaitingApproval: number;
  positionsFilled: number;
};

export type TeamRecruitmentJobRow = {
  id: string;
  title: string;
  jobCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  hiringManagerId: string | null;
  hiringManagerName: string | null;
  vacancies: number;
  applicationCount: number;
  interviewsCompleted: number;
  interviewsTotal: number;
  filledCount: number;
  hiringStatus: JobOpeningStatus;
};

export type TeamRecruitmentCandidateRow = {
  id: string;
  fullName: string;
  email: string;
  appliedPosition: string;
  jobOpeningId: string;
  experienceYears: number | null;
  source: string | null;
  currentStage: CandidateStage;
  assignedRecruiterName: string | null;
  interviewDate: string | null;
  interviewStatus: InterviewStatus | null;
  pendingFeedback: boolean;
  createdAt: string;
};

export type TeamRecruitmentListParams = {
  page: number;
  pageSize: number;
  search?: string;
  employeeId?: string;
  jobOpeningId?: string;
  stage?: CandidateStage;
  departmentId?: string;
  interviewStatus?: InterviewStatus;
  dateFrom?: string;
  dateTo?: string;
  view: "candidates" | "jobs";
};

export type TeamRecruitmentJobListResult = {
  data: TeamRecruitmentJobRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type TeamRecruitmentCandidateListResult = {
  data: TeamRecruitmentCandidateRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type TeamRecruitmentLookups = {
  departments: Array<{ id: string; label: string }>;
  employees: Array<{ id: string; label: string }>;
  jobs: Array<{ id: string; label: string; status: JobOpeningStatus }>;
  stages: Array<{ id: string; label: string }>;
  interviewStatuses: Array<{ id: string; label: string }>;
  panelMembers: Array<{ id: string; label: string }>;
};

export type RecruitmentAnalyticsPoint = {
  stage: CandidateStage;
  count: number;
};

export type TeamRecruitmentAnalytics = {
  candidatesByStage: RecruitmentAnalyticsPoint[];
  interviewSuccessRate: number;
  averageTimeToHireDays: number;
  departmentHiringProgress: Array<{
    departmentId: string;
    departmentName: string;
    openPositions: number;
    filledCount: number;
  }>;
  managerInterviewCompletionRate: number;
};

export type ManagerRecruitmentContext = {
  managerId: string;
  organizationId: string;
  departmentIds: string[];
};

export type InterviewCompetencyKey =
  | "technicalSkills"
  | "problemSolving"
  | "communication"
  | "cultureFit"
  | "leadership"
  | "confidence";

export type InterviewCompetencyRatings = Partial<Record<InterviewCompetencyKey, number>>;

export type OverallHireRecommendation = "strong_hire" | "hire" | "hold" | "reject";

export type ManagerOfferRecommendation = "approve" | "revise" | "reject";

export type TeamCandidateRecruitmentProfile = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  experienceYears: number | null;
  skills: string[];
  currentCompany: string | null;
  currentCtc: number | null;
  expectedCtc: number | null;
  noticePeriodDays: number | null;
  source: string | null;
  stage: CandidateStage;
  jobOpeningId: string;
  jobTitle: string;
  departmentName: string | null;
  hiringManagerName: string | null;
  resumePath: string | null;
  photoPath: string | null;
  notes: string | null;
  createdAt: string;
  timeline: TimelineItem[];
  interviews: InterviewListItem[];
  offers: OfferListItem[];
  pendingManagerInterviewId: string | null;
  pendingOfferId: string | null;
};

export type ManagerTeamRecruitmentPageData = {
  summary: TeamRecruitmentSummary;
  jobs: TeamRecruitmentJobListResult;
  candidates: TeamRecruitmentCandidateListResult;
  analytics: TeamRecruitmentAnalytics;
  lookups: TeamRecruitmentLookups;
  context: ManagerRecruitmentContext;
};

export type ManagerInterviewEvaluation = {
  interviewId: string;
  competencies: InterviewCompetencyRatings;
  overallRecommendation: OverallHireRecommendation;
  strengths?: string | null;
  improvements?: string | null;
  confidentialNotes?: string | null;
  recommendation: InterviewRecommendation;
  rating: number;
};

export type ManagerOfferApprovalView = {
  offerId: string;
  candidateName: string;
  jobTitle: string;
  salary: number;
  joiningDate: string;
  offerStatus: OfferStatus;
  managerRecommendation: ManagerOfferRecommendation | null;
  managerNotes: string | null;
  recommendedAt: string | null;
};
