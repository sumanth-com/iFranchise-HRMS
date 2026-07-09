import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";

export const roleListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
});

export const userRoleListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  roleId: z.string().uuid().optional(),
});

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Role name is required"),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores"),
  description: z.string().trim().optional().nullable(),
  parentRoleId: z.string().uuid().optional().nullable(),
  isDefault: z.boolean().default(false),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const rolePermissionsSchema = z.object({
  roleId: z.string().uuid(),
  permissionIds: z.array(z.string().uuid()),
});

export const assignUserRoleSchema = z.object({
  employeeId: z.string().uuid(),
  roleId: z.string().uuid(),
});

export const removeUserRoleSchema = z.object({
  userRoleId: z.string().uuid(),
});

export const roleCompareSchema = z.object({
  roleAId: z.string().uuid(),
  roleBId: z.string().uuid(),
});

export const roleSearchSchema = z.object({
  query: z.string().trim().min(1),
});

export const MODULE_LABELS: Record<string, string> = {
  organization: "Organization",
  branch: "Branches",
  department: "Departments",
  designation: "Designations",
  employment_type: "Employment Types",
  employee: "Employees",
  attendance: "Attendance",
  leave: "Leave",
  payroll: "Payroll",
  performance: "Performance",
  kpi: "KPIs",
  recruitment: "Recruitment",
  documents: "Documents",
  asset: "Assets",
  exit: "Exit",
  reports: "Reports",
  report: "Reports (Legacy)",
  security: "Roles & Permissions",
  notifications: "Notifications",
  audit: "Audit Logs",
  settings: "Settings",
  holiday: "Holidays",
  documents_module: "Documents",
};

export const ACTION_ORDER = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "reject",
  "export",
  "import",
  "assign",
  "manage",
  "generate",
  "process",
  "pay",
  "upload",
  "verify",
  "download",
  "run",
  "review",
  "feedback",
  "interview",
  "offer",
  "clearance",
  "settlement",
  "schedule",
  "withdraw",
  "cancel",
  "assign",
  "return",
  "progress",
] as const;
