import type { PortalKey } from "@/lib/auth/portals";
import type { LookupOption } from "@/types/employee";

/** Known executive role codes used for labels and sorting fallbacks. */
export const EXECUTIVE_ROLE_CODES = [
  "founder",
  "co_founder",
  "ceo",
  "hr_admin",
  "hr_executive",
  "manager",
] as const;

export type ExecutiveRoleCode = (typeof EXECUTIVE_ROLE_CODES)[number];

export const ROLE_LABELS: Record<string, string> = {
  founder: "Founder",
  co_founder: "Co-Founder",
  ceo: "CEO",
  hr_admin: "HR Admin",
  hr_executive: "HR Executive",
  manager: "Manager",
};

export type ProvisionableRoleOption = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  portalKey: PortalKey | null;
  portalLabel: string;
  departmentLabel: string;
};

export type ProvisioningRowAction =
  | "view"
  | "resend"
  | "cancel"
  | "deactivate"
  | "reactivate";

export type ProvisioningInvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "cancelled"
  | "revoked"
  | "inactive";

export type CeoProvisioningUser = {
  employeeId: string;
  userId: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  roleCode: string;
  portalKey: PortalKey | null;
  roleLabel: string;
  departmentName: string | null;
  branchName: string | null;
  designationTitle: string | null;
  reportingManagerName: string | null;
  invitationStatus: ProvisioningInvitationStatus;
  accountStatus: string;
  sentByName: string | null;
  invitationSentAt: string | null;
  acceptedAt: string | null;
  lastActivityAt: string | null;
  isSelf: boolean;
};

export type CeoProvisioningSummary = {
  totalExecutiveUsers: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  expiredInvitations: number;
  activeManagers: number;
  activeHrUsers: number;
  coFounders: number;
  founders: number;
};

export type CeoProvisioningListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  roleCode?: string;
  departmentId?: string;
  branchId?: string;
  portalKey?: PortalKey;
  employmentTypeId?: string;
  invitationStatus?: ProvisioningInvitationStatus;
};

export type CeoProvisioningListResult = {
  data: CeoProvisioningUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoProvisioningLookups = {
  roles: ProvisionableRoleOption[];
  departments: LookupOption[];
  branches: LookupOption[];
  employmentTypes: LookupOption[];
  managers: LookupOption[];
  portals: LookupOption[];
  statuses: LookupOption[];
};

export type CeoProvisioningTimelineEntry = {
  label: string;
  timestamp: string;
};

export type CeoProvisioningUserDetail = {
  user: CeoProvisioningUser;
  employmentTypeName: string | null;
  joiningDate: string | null;
  firstLoginAt: string | null;
  invitationCancelledAt: string | null;
  timeline: CeoProvisioningTimelineEntry[];
  permissions: string[];
};

export type CeoUserProvisioningPageData = {
  summary: CeoProvisioningSummary;
  users: CeoProvisioningListResult;
  lookups: CeoProvisioningLookups;
  inviteServiceReady: boolean;
};
