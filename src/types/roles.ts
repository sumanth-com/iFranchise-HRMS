import type { RecordStatus } from "@/types/auth";

export type RoleActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };

export type RoleListItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystemRole: boolean;
  isDefault: boolean;
  parentRoleId: string | null;
  parentRoleName: string | null;
  status: RecordStatus;
  userCount: number;
  permissionCount: number;
  portalKey: string | null;
  portalRoute: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoleListResult = {
  data: RoleListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type PermissionCatalogItem = {
  id: string;
  code: string;
  module: string;
  action: string;
  resource: string;
  description: string | null;
};

export type PermissionMatrixModule = {
  module: string;
  label: string;
  permissions: PermissionCatalogItem[];
};

export type RolePermissionDetail = {
  roleId: string;
  roleName: string;
  directPermissionIds: string[];
  inheritedPermissionIds: string[];
  effectivePermissionIds: string[];
  parentRoleId: string | null;
  parentRoleName: string | null;
};

export type UserRoleAssignment = {
  id: string;
  userId: string;
  employeeId: string | null;
  employeeCode: string | null;
  employeeName: string | null;
  employeeEmail: string | null;
  departmentName: string | null;
  accountStatus: string | null;
  lastLoginAt: string | null;
  roleId: string;
  roleName: string;
  roleCode: string;
  isSystemRole: boolean;
  portalKey: string | null;
  portalRoute: string | null;
  assignedAt: string;
  permissionCodes: string[];
};

export type UserRoleListResult = {
  data: UserRoleAssignment[];
  total: number;
  page: number;
  pageSize: number;
};

export type RolesDashboardStats = {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  usersAssigned: number;
  recentlyUpdated: RoleListItem[];
};

export type RoleComparison = {
  roleA: { id: string; name: string; code: string };
  roleB: { id: string; name: string; code: string };
  onlyInA: PermissionCatalogItem[];
  onlyInB: PermissionCatalogItem[];
  shared: PermissionCatalogItem[];
};

export type RoleSearchResult = {
  roles: { id: string; name: string; code: string }[];
  permissions: { id: string; code: string; module: string }[];
  employees: { id: string; name: string; employeeCode: string }[];
};

export type RoleExportFormat = "csv" | "excel";

export type RoleListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RecordStatus;
  roleType?: "system" | "custom";
};

export type RoleAccessPreview = {
  portals: { key: string; label: string; route: string | null }[];
  modules: { module: string; label: string; actions: string[] }[];
  restrictedModules: { module: string; label: string; actions: string[] }[];
};

export type RoleAssignedUser = {
  assignmentId: string;
  userId: string;
  employeeId: string | null;
  name: string | null;
  email: string | null;
  employeeCode: string | null;
  assignedAt: string;
};

export type RoleAuditEvent = {
  id: string;
  occurredAt: string;
  actorName: string | null;
  action: string;
  description: string | null;
};

export type RoleAccessDetail = {
  role: RoleListItem;
  assignedUsers: RoleAssignedUser[];
  permissionSummary: PermissionMatrixModule[];
  preview: RoleAccessPreview;
  auditEvents: RoleAuditEvent[];
};

export type RoleLookupOption = {
  id: string;
  label: string;
  code: string;
  isSystemRole: boolean;
  portalKey: string | null;
  portalRoute: string | null;
};

export type UserRoleListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string;
};
