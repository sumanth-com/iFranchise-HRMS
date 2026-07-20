export type DocumentSource = "upload" | "generated" | "system";
export type LetterStatus = "draft" | "pending_approval" | "published" | "archived";
export type DocumentStatus = "pending" | "verified" | "rejected" | "expired";

export type LetterType =
  | "offer_letter"
  | "appointment_letter"
  | "confirmation_letter"
  | "promotion_letter"
  | "salary_revision_letter"
  | "warning_letter"
  | "appreciation_letter"
  | "experience_letter"
  | "relieving_letter"
  | "termination_letter"
  | "resignation_acceptance_letter"
  | "settlement_letter";

export type DocumentTypeCode =
  | "PROFILE_PHOTO"
  | "RESUME"
  | "AADHAAR"
  | "PAN"
  | "OFFER_LETTER"
  | "APPOINTMENT_LETTER"
  | "EMPLOYMENT_AGREEMENT"
  | "NDA"
  | "SALARY_REVISION_LETTER"
  | "PROMOTION_LETTER"
  | "EXPERIENCE_LETTER"
  | "RELIEVING_LETTER"
  | "CONFIRMATION_LETTER"
  | "WARNING_LETTER"
  | "APPRECIATION_LETTER"
  | "TERMINATION_LETTER"
  | "RESIGNATION_ACCEPTANCE_LETTER"
  | "SETTLEMENT_LETTER"
  | "PASSPORT"
  | "VISA"
  | "DRIVING_LICENSE"
  | "CERTIFICATION"
  | "PROFESSIONAL_LICENSE"
  | "CERTIFICATE"
  | "OTHER";

export type DocumentSettings = {
  documentCategories: string[];
  allowedFileTypes: string[];
  maxUploadSizeMb: number;
  documentNumberPrefix: string;
  autoVerification: boolean;
  requireHrApprovalForLetters: boolean;
  enableEmployeeDownloads: boolean;
  retentionPeriodDays: number;
};

export type LetterPlaceholders = {
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  joiningDate: string;
  salary: string;
  companyName: string;
  manager: string;
  currentDate: string;
};

export type DocumentTypeItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isRequired: boolean;
  requiresExpiry: boolean;
};

export type EmployeeDocumentItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  designationTitle: string | null;
  branchName: string | null;
  documentTypeId: string;
  documentTypeName: string;
  documentTypeCode: string;
  title: string;
  documentNumber: string | null;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  documentStatus: DocumentStatus;
  source: DocumentSource;
  isOfficial: boolean;
  issuedDate: string | null;
  expiryDate: string | null;
  verifiedAt: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
};

export type EmployeeDocumentListResult = {
  data: EmployeeDocumentItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type EmployeeDocumentProfile = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  designationTitle: string | null;
  branchName: string | null;
  documents: EmployeeDocumentItem[];
};

export type TemplateItem = {
  id: string;
  name: string;
  letterType: LetterType;
  documentTypeCode: string;
  subject: string | null;
  bodyHtml: string;
  isDefault: boolean;
  updatedAt: string;
};

export type LetterItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  designationTitle: string | null;
  templateId: string | null;
  templateName: string | null;
  employeeDocumentId: string | null;
  letterType: LetterType;
  letterNumber: string | null;
  subject: string | null;
  bodyHtml: string;
  letterStatus: LetterStatus;
  generatedAt: string | null;
  publishedAt: string | null;
  sourceModule: string | null;
  createdAt: string;
};

export type LetterListResult = {
  data: LetterItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type DocumentsSummary = {
  totalDocuments: number;
  pendingVerification: number;
  expiringSoon: number;
  generatedThisMonth: number;
  uploadedToday: number;
  documentsByType: { typeCode: string; typeName: string; count: number }[];
  recentActivity: {
    id: string;
    title: string;
    employeeName: string;
    documentTypeName: string;
    action: string;
    createdAt: string;
  }[];
  recentUploads: EmployeeDocumentItem[];
};

export type ExpiringSummary = {
  expiringToday: number;
  next7Days: number;
  next30Days: number;
  expired: number;
};

export type DocumentsLookups = {
  employees: { id: string; label: string }[];
  departments: { id: string; label: string }[];
  documentTypes: DocumentTypeItem[];
  templates: { id: string; label: string; letterType: LetterType }[];
};

export type DocumentEmployeeCard = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  designationTitle: string | null;
  avatarUrl: string | null;
};
