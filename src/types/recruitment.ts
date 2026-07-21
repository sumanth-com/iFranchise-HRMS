export type JobOpeningStatus = "draft" | "open" | "paused" | "closed";
export type WorkMode = "onsite" | "hybrid" | "remote";
export type CandidateStage =
  | "applied"
  | "screening"
  | "technical"
  | "hr"
  | "ceo"
  | "offer"
  | "joined"
  | "rejected";
export type InterviewMeetingType = "offline" | "google_meet" | "zoom" | "teams";
export type InterviewStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type InterviewRecommendation = "reject" | "next_round" | "offer";
export type OfferStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export type RecruitmentSummary = {
  openPositions: number;
  activeCandidates: number;
  interviewsToday: number;
  offersPending: number;
  offersAccepted: number;
  hiresThisMonth: number;
  averageHiringTimeDays: number;
  candidatesByStage: { stage: CandidateStage; count: number }[];
  candidateSources: { source: string; count: number }[];
  hiringByDepartment: { departmentId: string; departmentName: string; count: number }[];
  upcomingInterviews: InterviewListItem[];
  recentActivity: TimelineItem[];
};

export type AnalyticsSummary = {
  funnel: { stage: CandidateStage; count: number }[];
  hiringByDepartment: { departmentName: string; count: number }[];
  averageTimeToHireDays: number;
  interviewConversionRate: number;
  offerAcceptanceRate: number;
  sources: { source: string; count: number }[];
  monthlyHiring: { month: string; count: number }[];
};

export type JobOpeningItem = {
  id: string;
  title: string;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationTitle: string | null;
  employmentTypeId: string | null;
  employmentTypeName: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  openPositions: number;
  location: string | null;
  workMode: WorkMode;
  hiringManagerId: string | null;
  hiringManagerName: string | null;
  requiredSkills: string[];
  jobDescription: string | null;
  jobStatus: JobOpeningStatus;
  candidateCount: number;
  createdAt: string;
};

export type JobOpeningListResult = {
  data: JobOpeningItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CandidateListItem = {
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
  resumePath: string | null;
  photoPath: string | null;
  notes: string | null;
  employeeId: string | null;
  createdAt: string;
};

export type CandidateListResult = {
  data: CandidateListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TimelineItem = {
  id: string;
  candidateId?: string;
  candidateName?: string;
  eventType: string;
  title: string;
  description: string | null;
  createdAt: string;
};

export type CandidateDetail = CandidateListItem & {
  timeline: TimelineItem[];
  interviews: InterviewListItem[];
  offers: OfferListItem[];
};

export type InterviewListItem = {
  id: string;
  candidateId: string;
  candidateName: string;
  jobOpeningId: string;
  jobTitle: string;
  interviewerEmployeeId: string;
  interviewerName: string;
  roundName: string;
  interviewDate: string;
  interviewTime: string;
  meetingLink: string | null;
  interviewType: InterviewMeetingType;
  interviewStatus: InterviewStatus;
  rating: number | null;
  comments: string | null;
  recommendation: InterviewRecommendation | null;
  createdAt: string;
};

export type InterviewListResult = {
  data: InterviewListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type OfferListItem = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobOpeningId: string;
  jobTitle: string;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationTitle: string | null;
  branchId: string | null;
  branchName: string | null;
  employmentTypeId: string | null;
  employmentTypeName: string | null;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  salary: number;
  joiningDate: string;
  offerLetterPath: string | null;
  offerStatus: OfferStatus;
  expiresAt: string | null;
  employeeId: string | null;
  notes: string | null;
  createdAt: string;
};

export type OfferListResult = {
  data: OfferListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CandidateSourceItem = {
  id: string;
  label: string;
  enabled: boolean;
};

export type RecruitmentEmailNotifications = {
  interviewScheduled: boolean;
  interviewCancelled: boolean;
  offerSent: boolean;
  offerAccepted: boolean;
  offerRejected: boolean;
  joiningReminder: boolean;
};

export type RecruitmentNumberFormats = {
  candidatePrefix: string;
  jobPrefix: string;
  offerPrefix: string;
};

export type RecruitmentSettings = {
  candidateSources: CandidateSourceItem[];
  defaultHiringManagerId: string | null;
  defaultInterviewDurationMinutes: 30 | 45 | 60 | 90;
  noticePeriodOptions: string[];
  autoEmployeeCreation: boolean;
  autoArchiveRejectedDays: 30 | 60 | 90 | 180;
  emailNotifications: RecruitmentEmailNotifications;
  numberFormats: RecruitmentNumberFormats;
};

export type RecruitmentLookups = {
  departments: { id: string; label: string }[];
  designations: { id: string; label: string }[];
  employmentTypes: { id: string; label: string }[];
  branches: { id: string; label: string }[];
  employees: { id: string; label: string }[];
  jobs: { id: string; label: string; status?: JobOpeningStatus }[];
  sources: string[];
  noticePeriodOptions: string[];
  defaultHiringManagerId: string | null;
  defaultInterviewDurationMinutes: number;
};
