import type { EmploymentStatus, RecordStatus } from "@/types/auth";

export type {
  EmploymentStatus,
  RecordStatus,
} from "@/types/auth";

export type GenderType =
  | "male"
  | "female"
  | "other"
  | "prefer_not_to_say";

export type MaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "other";

export type AddressType = "current" | "permanent" | "work";

export type DocumentStatus = "pending" | "verified" | "rejected" | "expired";

export type EmployeeAccountStatus =
  | "draft"
  | "invited"
  | "invitation_pending"
  | "active"
  | "inactive"
  | "suspended";

export type EmployeeListItem = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  employmentStatus: EmploymentStatus;
  dateOfJoining: string | null;
  branchId: string;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationTitle: string | null;
  profileImagePath: string | null;
  accountStatus: EmployeeAccountStatus;
  invitationSentAt: string | null;
  lastLoginAt: string | null;
};

export type EmployeeListResult = {
  data: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type EmployeeAccountProvisioningItem = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  accountStatus: EmployeeAccountStatus;
  invitationSentAt: string | null;
  lastLoginAt: string | null;
};

export type EmployeeAccountProvisioningSummary = {
  draft: number;
  invited: number;
  invitationPending: number;
  active: number;
  inactive: number;
  suspended: number;
  readyToInvite: EmployeeAccountProvisioningItem[];
  pendingInvitations: EmployeeAccountProvisioningItem[];
  suspendedAccounts: EmployeeAccountProvisioningItem[];
};

export type EmployeeListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: EmployeeSortField;
  sortOrder?: "asc" | "desc";
  department?: string;
  employmentStatus?: EmploymentStatus;
  accountStatus?: EmployeeAccountStatus;
};

export type EmployeeSortField =
  | "employee_code"
  | "first_name"
  | "last_name"
  | "email"
  | "date_of_joining"
  | "employment_status"
  | "account_status"
  | "last_login_at";

export type LookupOption = {
  id: string;
  label: string;
  code?: string;
};

export type EmployeeRouteIdentity = {
  employeeCode: string;
  firstName: string;
  lastName: string;
};

export type EmployeeDetail = {
  id: string;
  organizationId: string;
  branchId: string;
  departmentId: string | null;
  designationId: string | null;
  employmentTypeId: string | null;
  reportingManagerId: string | null;
  userId: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  employmentStatus: EmploymentStatus;
  dateOfJoining: string | null;
  dateOfLeaving: string | null;
  status: RecordStatus;
  accountStatus: EmployeeAccountStatus;
  invitationSentAt: string | null;
  invitationCancelledAt: string | null;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  passwordLastResetAt: string | null;
  accountSuspendedAt: string | null;
  accountDeactivatedAt: string | null;
  accountActivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  branchName: string | null;
  departmentName: string | null;
  designationTitle: string | null;
  employmentTypeName: string | null;
  reportingManagerName: string | null;
  profile: EmployeeProfileDetail | null;
  addresses: EmployeeAddressDetail[];
  emergencyContacts: EmergencyContactDetail[];
  documents: EmployeeDocumentDetail[];
};

export type EmployeeProfileDetail = {
  id: string;
  dateOfBirth: string | null;
  gender: GenderType | null;
  maritalStatus: MaritalStatus | null;
  nationality: string | null;
  bloodGroup: string | null;
  personalEmail: string | null;
  personalPhone: string | null;
  profileImageStoragePath: string | null;
  bio: string | null;
  preferredName: string | null;
};

export type EmployeeAddressDetail = {
  id: string;
  addressType: AddressType;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isPrimary: boolean;
};

export type EmergencyContactDetail = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  isPrimary: boolean;
};

export type EmployeeDocumentDetail = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  documentStatus: DocumentStatus;
  issuedDate: string | null;
  expiryDate: string | null;
  documentTypeId: string;
  documentTypeName: string | null;
  createdAt: string;
};

export type EmployeeBankAccountDetail = {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string | null;
  branchName: string | null;
  accountType: string;
  isPrimary: boolean;
};

export type EmployeeLeaveBalanceDetail = {
  id: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  balanceYear: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  balanceDays: number;
};

export type EmployeeLeaveRequestDetail = {
  id: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  leaveStatus: string;
  appliedAt: string | null;
  reason: string | null;
};

export type EmployeeLeaveApprovalDetail = {
  id: string;
  leaveRequestId: string;
  approvalLevel: number;
  approvalStatus: string;
  approverName: string;
  comments: string | null;
  actedAt: string | null;
  leaveStartDate: string;
  leaveEndDate: string;
  leaveStatus: string;
};

export type EmployeeSalaryStructureDetail = {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  currencyCode: string;
  basicSalary: number;
  hraAmount: number;
  transportAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  netSalary: number;
  components: Record<string, unknown>;
};

export type EmployeeAttendanceSummary = {
  totalRecords: number;
  presentDays: number;
  totalWorkHours: number;
};

export type EmployeeTimelineEvent = {
  id: string;
  event: string;
  description: string;
  occurredAt: string;
};

export type EmployeeWizardInput = {
  basic: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: GenderType;
    maritalStatus?: MaritalStatus;
    nationality?: string;
    bloodGroup?: string;
    personalEmail?: string;
    personalPhone?: string;
    bio?: string;
  };
  employment: {
    branchId: string;
    departmentId?: string;
    designationId?: string;
    employmentTypeId?: string;
    reportingManagerId?: string;
    employmentStatus: EmploymentStatus;
    dateOfJoining?: string;
    dateOfLeaving?: string;
  };
  address: {
    addressType: AddressType;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    isPrimary: boolean;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isPrimary: boolean;
  };
  documents: Array<{
    title: string;
    documentTypeId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    storagePath: string;
    issuedDate?: string;
    expiryDate?: string;
  }>;
};

export type EmployeeActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };
