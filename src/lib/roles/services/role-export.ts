import { format } from "date-fns";

import { reportToCsv } from "@/lib/reports/services/reports-utils";
import { buildXlsxBase64 } from "@/lib/reports/services/xlsx-builder";
import type { ReportColumn, ReportKey, ReportResult } from "@/types/reports";
import type { RoleExportFormat, RoleListItem, UserRoleAssignment } from "@/types/roles";

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) return "";
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function toCsvResult(
  key: ReportKey,
  title: string,
  columns: ReportColumn[],
  rows: Record<string, string | number>[],
): string {
  const result: ReportResult = {
    key,
    title,
    columns,
    rows: rows.map((row) => {
      const next: ReportResult["rows"][number] = {};
      for (const col of columns) {
        const value = row[col.key];
        next[col.key] = value == null ? "" : String(value);
      }
      return next;
    }),
    total: rows.length,
    generatedAt: new Date().toISOString(),
  };
  return reportToCsv(result);
}

export type RoleExportPayload =
  | {
      format: "csv";
      content: string;
      filename: string;
      mimeType: "text/csv;charset=utf-8";
      encoding: "utf-8";
    }
  | {
      format: "excel";
      content: string;
      filename: string;
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      encoding: "base64";
    };

function rolesTable(items: RoleListItem[]) {
  const headers = [
    "Role Name",
    "Code",
    "Description",
    "Type",
    "Inherits From",
    "Users",
    "Permissions",
    "Status",
    "Created",
    "Updated",
  ];
  const columns: ReportColumn[] = [
    { key: "name", header: "Role Name" },
    { key: "code", header: "Code" },
    { key: "description", header: "Description" },
    { key: "roleType", header: "Type" },
    { key: "parentRoleName", header: "Inherits From" },
    { key: "userCount", header: "Users" },
    { key: "permissionCount", header: "Permissions" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Created" },
    { key: "updatedAt", header: "Updated" },
  ];
  const records = items.map((item) => ({
    name: item.name,
    code: item.code,
    description: item.description ?? "",
    roleType: item.isSystemRole ? "System" : "Custom",
    parentRoleName: item.parentRoleName ?? "",
    userCount: item.userCount,
    permissionCount: item.permissionCount,
    status: item.status,
    createdAt: formatUpdatedAt(item.createdAt),
    updatedAt: formatUpdatedAt(item.updatedAt),
  }));
  const sheetRows = records.map((row) => [
    row.name,
    row.code,
    row.description,
    row.roleType,
    row.parentRoleName,
    row.userCount,
    row.permissionCount,
    row.status,
    row.createdAt,
    row.updatedAt,
  ]);
  return { headers, columns, records, sheetRows };
}

function assignmentsTable(items: UserRoleAssignment[]) {
  const headers = [
    "Employee Code",
    "Employee",
    "Email",
    "Department",
    "Role",
    "Portal",
    "Account Status",
    "Last Login",
    "Assigned At",
  ];
  const columns: ReportColumn[] = [
    { key: "employeeCode", header: "Employee Code" },
    { key: "employeeName", header: "Employee" },
    { key: "employeeEmail", header: "Email" },
    { key: "departmentName", header: "Department" },
    { key: "roleName", header: "Role" },
    { key: "portal", header: "Portal" },
    { key: "accountStatus", header: "Account Status" },
    { key: "lastLoginAt", header: "Last Login" },
    { key: "assignedAt", header: "Assigned At" },
  ];
  const records = items.map((item) => ({
    employeeCode: item.employeeCode ?? "",
    employeeName: item.employeeName ?? "",
    employeeEmail: item.employeeEmail ?? "",
    departmentName: item.departmentName ?? "",
    roleName: item.roleName,
    portal: item.portalKey ?? "",
    accountStatus: item.accountStatus ?? "",
    lastLoginAt: formatUpdatedAt(item.lastLoginAt),
    assignedAt: formatUpdatedAt(item.assignedAt),
  }));
  const sheetRows = records.map((row) => [
    row.employeeCode,
    row.employeeName,
    row.employeeEmail,
    row.departmentName,
    row.roleName,
    row.portal,
    row.accountStatus,
    row.lastLoginAt,
    row.assignedAt,
  ]);
  return { headers, columns, records, sheetRows };
}

export function exportRolesPayload(
  items: RoleListItem[],
  formatType: RoleExportFormat,
  stamp: string,
): RoleExportPayload {
  const table = rolesTable(items);
  if (formatType === "csv") {
    return {
      format: "csv",
      content: toCsvResult("hr_employee_master", "Roles", table.columns, table.records),
      filename: `roles-export-${stamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      encoding: "utf-8",
    };
  }
  return {
    format: "excel",
    content: buildXlsxBase64("Roles", table.headers, table.sheetRows),
    filename: `roles-export-${stamp}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    encoding: "base64",
  };
}

export function exportUserRolesPayload(
  items: UserRoleAssignment[],
  formatType: RoleExportFormat,
  stamp: string,
): RoleExportPayload {
  const table = assignmentsTable(items);
  if (formatType === "csv") {
    return {
      format: "csv",
      content: toCsvResult(
        "hr_employee_master",
        "User Role Assignments",
        table.columns,
        table.records,
      ),
      filename: `user-role-assignments-${stamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      encoding: "utf-8",
    };
  }
  return {
    format: "excel",
    content: buildXlsxBase64("Assignments", table.headers, table.sheetRows),
    filename: `user-role-assignments-${stamp}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    encoding: "base64",
  };
}
