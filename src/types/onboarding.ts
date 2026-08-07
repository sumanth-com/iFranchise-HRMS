export const ONBOARDING_STATUSES = [
  "draft",
  "invitation_sent",
  "invitation_viewed",
  "in_progress",
  "documents_uploaded",
  "pending_hr_review",
  "corrections_requested",
  "approved",
  "rejected",
  "employee_created",
  "completed",
  "cancelled",
  "archived",
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  draft: "Draft",
  invitation_sent: "Invitation Sent",
  invitation_viewed: "Invitation Viewed",
  in_progress: "In Progress",
  documents_uploaded: "Documents Uploaded",
  pending_hr_review: "Pending HR Review",
  corrections_requested: "Corrections Requested",
  approved: "Approved",
  rejected: "Rejected",
  employee_created: "Employee Created",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const ONBOARDING_ROUTES = {
  hrList: "/dashboard/recruitment/onboarding",
  hrDetail: (id: string) => `/dashboard/recruitment/onboarding/${id}`,
  invite: (token: string) => `/onboarding/invite/${token}`,
  login: "/onboarding/login",
  portal: "/onboarding/portal",
} as const;

export const ONBOARDING_STORAGE_BUCKET = "onboarding-documents";

export const ONBOARDING_SESSION_COOKIE = "ifranchise_onboarding_session";

export const ONBOARDING_INVITATION_TTL_HOURS = 72;

export const ONBOARDING_OTP_TTL_MINUTES = 15;

export const ONBOARDING_SESSION_TTL_DAYS = 7;

export const ONBOARDING_WIZARD_SECTIONS = [
  "personal",
  "identity",
  "education",
  "employment_history",
  "bank",
  "tax",
  "policies",
  "agreements",
  "signature",
] as const;

export type OnboardingWizardSection = (typeof ONBOARDING_WIZARD_SECTIONS)[number];

export const ONBOARDING_POLICY_DOCUMENTS = [
  { code: "employee_handbook", label: "Employee Handbook" },
  { code: "leave_policy", label: "Leave Policy" },
  { code: "attendance_policy", label: "Attendance Policy" },
  { code: "code_of_conduct", label: "Code of Conduct" },
  { code: "it_policy", label: "IT Policy" },
  { code: "privacy_policy", label: "Privacy Policy" },
  { code: "data_protection", label: "Data Protection Policy" },
] as const;

export const ONBOARDING_AGREEMENT_TYPES = [
  { code: "offer_letter", label: "Offer Letter" },
  { code: "employment_agreement", label: "Employment Agreement" },
  { code: "nda", label: "NDA" },
  { code: "confidentiality", label: "Confidentiality Agreement" },
  { code: "ip_agreement", label: "IP Agreement" },
  { code: "asset_responsibility", label: "Asset Responsibility Agreement" },
] as const;

export const ONBOARDING_IDENTITY_DOCUMENTS = [
  { code: "aadhaar", label: "Aadhaar", required: true },
  { code: "pan", label: "PAN", required: true },
  { code: "passport", label: "Passport", required: false },
  { code: "driving_license", label: "Driving License", required: false },
] as const;

export const ONBOARDING_EMPLOYMENT_DOCUMENTS = [
  { code: "resume", label: "Resume", required: true },
  { code: "offer_letter", label: "Offer Letters", required: false },
  { code: "experience_letter", label: "Experience Letters", required: false },
  { code: "relieving_letter", label: "Relieving Letters", required: false },
  { code: "salary_slip", label: "Salary Slips / Payslips", required: false },
] as const;

export const ONBOARDING_EDUCATION_LEVELS = [
  { code: "ssc", label: "SSC / 10th" },
  { code: "intermediate", label: "Intermediate / 12th" },
  { code: "diploma", label: "Diploma" },
  { code: "graduation", label: "Graduation" },
  { code: "post_graduation", label: "Post Graduation" },
  { code: "certification", label: "Certification / Other" },
] as const;

export type OnboardingEducationLevelCode = (typeof ONBOARDING_EDUCATION_LEVELS)[number]["code"];

export type OnboardingEducationEntry = {
  id: string;
  level: OnboardingEducationLevelCode;
  institutionName: string;
};

export const ONBOARDING_SIGNATURE_STYLES = [
  { id: "script_casual", label: "Casual Script", fontFamily: "var(--font-signature-casual), cursive" },
  { id: "script_round", label: "Rounded Script", fontFamily: "var(--font-signature-round), cursive" },
  { id: "script_elegant", label: "Elegant Script", fontFamily: "var(--font-signature-elegant), cursive" },
  { id: "script_formal", label: "Formal Script", fontFamily: "var(--font-signature-formal), cursive" },
  { id: "script_bold", label: "Bold Script", fontFamily: "var(--font-signature-bold), cursive" },
  { id: "script_classic", label: "Classic Script", fontFamily: "var(--font-signature-classic), cursive" },
] as const;

export const ONBOARDING_DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  identity: "Identity documents",
  education: "Education certificates",
  employment: "Employment documents",
  bank: "Bank documents",
};

export type OnboardingDocumentReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "correction_requested";

export type OnboardingSignatureType = "typed" | "drawn" | "uploaded";

export type OnboardingCaseListItem = {
  id: string;
  fullName: string;
  personalEmail: string;
  mobileNumber: string | null;
  status: OnboardingStatus;
  designationName: string | null;
  departmentName: string | null;
  joiningDate: string | null;
  completionPercent: number;
  intendedRoleName: string;
  invitationSentAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};

export type OnboardingCaseDetail = OnboardingCaseListItem & {
  organizationId: string;
  reportingManagerName: string | null;
  employmentTypeName: string | null;
  workLocationName: string | null;
  branchName: string | null;
  employmentCategory: string | null;
  offerReferenceNumber: string | null;
  intendedRoleId: string;
  employeeId: string | null;
  companyEmail: string | null;
  employeeCode: string | null;
  hrComments: string | null;
  correctionNotes: string | null;
  sections: OnboardingSectionRecord[];
  documents: OnboardingDocumentRecord[];
  policyAcknowledgements: string[];
  agreements: OnboardingAgreementRecord[];
  signature: OnboardingSignatureRecord | null;
  timeline: OnboardingTimelineEvent[];
};

export type OnboardingSectionRecord = {
  sectionKey: OnboardingWizardSection;
  data: Record<string, unknown>;
  completedAt: string | null;
};

export type OnboardingDocumentRecord = {
  id: string;
  documentCategory: string;
  documentTypeCode: string;
  fileName: string;
  fileSize: number | null;
  reviewStatus: OnboardingDocumentReviewStatus;
  hrComment: string | null;
  reviewedAt: string | null;
  signedUrl?: string | null;
};

export type OnboardingAgreementRecord = {
  agreementType: string;
  signedAt: string | null;
  lockedAt: string | null;
};

export type OnboardingSignatureRecord = {
  id: string;
  signatureType: OnboardingSignatureType;
  signatureStyle: string | null;
  finalizedAt: string;
};

export type OnboardingTimelineEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  occurredAt: string;
};

export type OnboardingListParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
};

export type OnboardingDashboardStats = {
  total: number;
  pendingReview: number;
  inProgress: number;
  completed: number;
  invitationSent: number;
};

export type OnboardingLookups = {
  departments: { id: string; name: string }[];
  designations: { id: string; title: string }[];
  branches: { id: string; name: string }[];
  employmentTypes: { id: string; name: string }[];
  workLocations: { id: string; name: string }[];
  managers: { id: string; name: string }[];
  roles: { id: string; name: string; code: string }[];
};

export type CandidatePortalContext = {
  caseId: string;
  fullName: string;
  personalEmail: string;
  status: OnboardingStatus;
  completionPercent: number;
  joiningDate: string | null;
  correctionNotes: string | null;
  sections: OnboardingSectionRecord[];
  documents: OnboardingDocumentRecord[];
  policyAcknowledgements: string[];
  agreements: OnboardingAgreementRecord[];
  signature: OnboardingSignatureRecord | null;
  locked: boolean;
};
