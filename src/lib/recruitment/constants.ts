import { hasAnyPermission } from "@/lib/permissions/utils";
import type {
  CandidateStage,
  InterviewMeetingType,
  InterviewRecommendation,
  InterviewStatus,
  JobOpeningStatus,
  OfferStatus,
  WorkMode,
} from "@/types/recruitment";

export const RECRUITMENT_ROUTES = {
  dashboard: "/dashboard/recruitment",
  jobs: "/dashboard/recruitment/jobs",
  candidates: "/dashboard/recruitment/candidates",
  interviews: "/dashboard/recruitment/interviews",
  offers: "/dashboard/recruitment/offers",
  analytics: "/dashboard/recruitment/analytics",
  onboarding: "/dashboard/recruitment/onboarding",
} as const;

export const RECRUITMENT_SUB_NAV = [
  { title: "Job Openings", href: RECRUITMENT_ROUTES.jobs },
  { title: "Candidates", href: RECRUITMENT_ROUTES.candidates },
  { title: "Interviews", href: RECRUITMENT_ROUTES.interviews },
  { title: "Offers", href: RECRUITMENT_ROUTES.offers },
] as const;

export const OFFER_QUEUE_FILTER_LABELS = {
  all: "All offer candidates",
  pending: "Pending upload",
  sent: "Letter uploaded",
  accepted: "Accepted",
} as const;

export const OFFER_QUEUE_STAGE_LABELS = {
  ceo: "Ready — CEO cleared",
  offer: "At offer stage",
} as const;

/** Recruitment + onboarding tabs shown in the shared hiring module shell. */
export const HIRING_SUB_NAV = [
  ...RECRUITMENT_SUB_NAV,
  { title: "Onboarding", href: RECRUITMENT_ROUTES.onboarding },
] as const;

export const JOB_STATUS_LABELS: Record<JobOpeningStatus, string> = {
  draft: "Draft",
  open: "Open",
  paused: "Paused",
  closed: "Closed",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  applied: "Applied",
  screening: "Screening",
  technical: "Technical",
  hr: "HR",
  ceo: "CEO",
  offer: "Offer",
  joined: "Joined",
  rejected: "Rejected",
};

export const CANDIDATE_PIPELINE: CandidateStage[] = [
  "applied",
  "screening",
  "technical",
  "hr",
  "ceo",
  "offer",
  "joined",
];

/** Screening → offer only — used on candidate profile pipeline track. */
export const CANDIDATE_PROFILE_PIPELINE: CandidateStage[] = [
  "screening",
  "technical",
  "hr",
  "ceo",
  "offer",
];

export const INTERVIEW_TYPE_LABELS: Record<InterviewMeetingType, string> = {
  offline: "Offline",
  google_meet: "Google Meet",
  zoom: "Zoom",
  teams: "Teams",
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = {
  reject: "Reject",
  next_round: "Next Round",
  offer: "Offer",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Draft",
  sent: "Letter uploaded",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

export function getCandidateStageBadge(
  stage: CandidateStage,
  latestOfferStatus?: OfferStatus | null,
): { label: string; status: string } {
  if (stage === "offer" && latestOfferStatus === "accepted") {
    return { label: "Offer accepted", status: "accepted" };
  }
  if (stage === "offer" && latestOfferStatus === "sent") {
    return { label: "Letter uploaded", status: "offer_sent" };
  }
  return { label: CANDIDATE_STAGE_LABELS[stage], status: stage };
}

export const DEFAULT_CANDIDATE_SOURCES = [
  { id: "linkedin", label: "LinkedIn", enabled: true },
  { id: "naukri", label: "Naukri", enabled: true },
  { id: "indeed", label: "Indeed", enabled: true },
  { id: "career_page", label: "Company Career Page", enabled: true },
  { id: "referral", label: "Employee Referral", enabled: true },
  { id: "walk_in", label: "Walk-in", enabled: true },
  { id: "agency", label: "Recruitment Agency", enabled: true },
  { id: "campus", label: "Campus Placement", enabled: true },
  { id: "other", label: "Other", enabled: true },
] as const;

export const DEFAULT_NOTICE_PERIOD_OPTIONS = [
  "Immediate",
  "15 Days",
  "30 Days",
  "45 Days",
  "60 Days",
  "90 Days",
] as const;

export const INTERVIEW_DURATION_OPTIONS = [
  { value: 30, label: "30 Minutes" },
  { value: 45, label: "45 Minutes" },
  { value: 60, label: "60 Minutes" },
  { value: 90, label: "90 Minutes" },
] as const;

export const ARCHIVE_DAYS_OPTIONS = [
  { value: 30, label: "30 Days" },
  { value: 60, label: "60 Days" },
  { value: 90, label: "90 Days" },
  { value: 180, label: "180 Days" },
] as const;

const VIEW = ["recruitment.view"];
const CREATE = ["recruitment.create"];
const EDIT = ["recruitment.edit"];
const DELETE = ["recruitment.delete"];
const INTERVIEW = ["recruitment.interview", "recruitment.edit"];
const OFFER = ["recruitment.offer", "recruitment.edit"];

export function canViewRecruitment(codes: string[]) {
  return hasAnyPermission(codes, VIEW);
}
export function canCreateRecruitment(codes: string[]) {
  return hasAnyPermission(codes, CREATE);
}
export function canEditRecruitment(codes: string[]) {
  return hasAnyPermission(codes, EDIT);
}
export function canDeleteRecruitment(codes: string[]) {
  return hasAnyPermission(codes, DELETE);
}
export function canInterviewRecruitment(codes: string[]) {
  return hasAnyPermission(codes, INTERVIEW);
}
export function canManageOffers(codes: string[]) {
  return hasAnyPermission(codes, OFFER);
}
