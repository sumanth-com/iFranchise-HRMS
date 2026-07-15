import type {
  CandidateStage,
  InterviewMeetingType,
  InterviewStatus,
  JobOpeningStatus,
  OfferStatus,
} from "@/types/recruitment";
import type { LookupOption } from "@/types/employee";

export type CeoRecruitmentListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  jobOpeningId?: string;
  recruiterId?: string;
  stage?: CandidateStage;
  employmentTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CeoRecruitmentKpis = {
  openPositions: number;
  totalCandidates: number;
  interviewsToday: number;
  interviewsThisWeek: number;
  offersPending: number;
  offersAccepted: number;
  hiresThisMonth: number;
  averageTimeToHireDays: number;
  offerAcceptanceRate: number;
  recruitmentSuccessRate: number;
};

export type CeoRecruitmentPipelineStage = {
  stage: CandidateStage;
  label: string;
  count: number;
  conversionRate: number;
};

export type CeoRecruitmentCandidateRow = {
  id: string;
  candidateCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobOpeningId: string;
  jobTitle: string;
  departmentId: string | null;
  departmentName: string | null;
  recruiterId: string | null;
  recruiterName: string | null;
  stage: CandidateStage;
  interviewDate: string | null;
  experienceYears: number | null;
  expectedCtc: number | null;
  statusLabel: string;
  photoPath: string | null;
  createdAt: string;
};

export type CeoRecruitmentCandidateListResult = {
  data: CeoRecruitmentCandidateRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoRecruitmentInterviewRow = {
  id: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  departmentName: string | null;
  interviewerName: string;
  interviewDate: string;
  interviewTime: string;
  interviewType: InterviewMeetingType;
  interviewStatus: InterviewStatus;
};

export type CeoRecruitmentJobRow = {
  id: string;
  title: string;
  departmentName: string | null;
  openPositions: number;
  candidateCount: number;
  hiringManagerName: string | null;
  jobStatus: JobOpeningStatus;
  daysOpen: number;
  employmentTypeName: string | null;
  createdAt: string;
};

export type CeoRecruitmentInsights = {
  hiringByDepartment: { label: string; value: number }[];
  hiringTrend: { label: string; value: number }[];
  funnel: { label: string; value: number }[];
  interviewSuccessRate: number;
  offerAcceptanceRate: number;
  averageHiringTimeDays: number;
  openVsClosed: { label: string; value: number }[];
  topHiringDepartments: { label: string; value: number }[];
  recruiterPerformance: { label: string; value: number }[];
};

export type CeoRecruitmentFilterLookups = {
  departments: LookupOption[];
  jobs: LookupOption[];
  recruiters: LookupOption[];
  employmentTypes: LookupOption[];
};

export type CeoRecruitmentCandidateDetail = {
  id: string;
  candidateCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  experienceYears: number | null;
  skills: string[];
  currentCompany: string | null;
  education: string | null;
  photoPath: string | null;
  resumePath: string | null;
  photoUrl: string | null;
  resumeUrl: string | null;
  stage: CandidateStage;
  jobTitle: string;
  departmentName: string | null;
  recruiterName: string | null;
  expectedCtc: number | null;
  notes: string | null;
  timeline: { id: string; title: string; description: string | null; createdAt: string }[];
  interviews: {
    id: string;
    roundName: string;
    interviewDate: string;
    interviewTime: string;
    interviewerName: string;
    interviewStatus: InterviewStatus;
    rating: number | null;
    comments: string | null;
    recommendation: string | null;
  }[];
  offerStatus: OfferStatus | null;
  expectedJoiningDate: string | null;
};

export type CeoRecruitmentPageData = {
  kpis: CeoRecruitmentKpis;
  pipeline: CeoRecruitmentPipelineStage[];
  candidates: CeoRecruitmentCandidateListResult;
  interviews: CeoRecruitmentInterviewRow[];
  jobs: CeoRecruitmentJobRow[];
  insights: CeoRecruitmentInsights;
  lookups: CeoRecruitmentFilterLookups;
};
