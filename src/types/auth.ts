export type RecordStatus = "active" | "inactive" | "archived";

export type EmploymentStatus =
  | "draft"
  | "probation"
  | "active"
  | "on_leave"
  | "suspended"
  | "terminated"
  | "resigned";

export type Employee = {
  id: string;
  organizationId: string;
  branchId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  employmentStatus: EmploymentStatus;
  accountStatus?: "draft" | "invited" | "invitation_pending" | "active" | "inactive" | "suspended";
  status: RecordStatus;
};

export type Organization = {
  id: string;
  name: string;
  legalName: string | null;
  email: string | null;
  logoStoragePath: string | null;
  status: RecordStatus;
};

export type Role = {
  id: string;
  name: string;
  code: string;
  isSystemRole: boolean;
  status: RecordStatus;
};

export type Permission = {
  id: string;
  code: string;
  module: string;
  action: string;
  resource: string;
};

export type UserProfile = {
  userId: string;
  email: string;
  employee: Employee;
  organization: Organization;
  roles: Role[];
  permissions: Permission[];
  permissionCodes: string[];
};

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "EMPLOYEE_NOT_FOUND"
  | "EMPLOYEE_INACTIVE"
  | "EMPLOYEE_DELETED"
  | "NO_ROLES"
  | "ORGANIZATION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "VALIDATION_ERROR"
  | "PASSWORD_MISMATCH"
  | "RESET_LINK_INVALID";

export type AuthActionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: AuthErrorCode; message: string };
