import type { ReportColumn, ReportKey, ReportResult } from "@/types/reports";
import type { RoleExportFormat, RoleListItem, UserRoleAssignment } from "@/types/roles";
import { reportToCsv, reportToExcelXml, toCell } from "@/lib/reports/services/reports-utils";

function buildResult(
  key: ReportKey,
  title: string,
  columns: ReportColumn[],
  items: Record<string, unknown>[],
): ReportResult {
  const rows = items.map((item) => {
    const row: ReportResult["rows"][number] = {};
    for (const col of columns) {
      row[col.key] = toCell(item[col.key]);
    }
    return row;
  });
  return {
    key,
    title,
    columns,
    rows,
    total: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

export function exportRoles(items: RoleListItem[], format: RoleExportFormat) {
  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Role Name" },
    { key: "description", header: "Description" },
    { key: "parentRoleName", header: "Inherits From" },
    { key: "isSystemRole", header: "System Role" },
    { key: "isDefault", header: "Default" },
    { key: "userCount", header: "Users" },
    { key: "permissionCount", header: "Permissions" },
    { key: "status", header: "Status" },
  ];
  const result = buildResult("hr_employee_master", "Roles", columns, items as unknown as Record<string, unknown>[]);
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}

export function exportUserRoles(items: UserRoleAssignment[], format: RoleExportFormat) {
  const columns = [
    { key: "employeeCode", header: "Employee Code" },
    { key: "employeeName", header: "Employee" },
    { key: "employeeEmail", header: "Email" },
    { key: "departmentName", header: "Department" },
    { key: "roleName", header: "Role" },
    { key: "assignedAt", header: "Assigned At" },
  ];
  const result = buildResult(
    "hr_employee_master",
    "User Role Assignments",
    columns,
    items as unknown as Record<string, unknown>[],
  );
  return format === "excel" ? reportToExcelXml(result) : reportToCsv(result);
}
