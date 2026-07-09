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
  roleId: string;
  roleName: string;
  roleCode: string;
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
};

export type UserRoleListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string;
};
