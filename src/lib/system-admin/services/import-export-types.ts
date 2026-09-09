/** Client-safe import/export types (no server-only imports). */

export type ImportJobRow = {
  id: string;
  module: string;
  format: string;
  status: string;
  recordCount: number | null;
  successCount: number | null;
  errorCount: number | null;
  createdAt: string;
  completedAt: string | null;
};

export const EXPORT_MODULES = [
  "employees",
  "departments",
  "roles",
  "attendance",
  "leave",
  "assets",
  "payroll",
  "performance",
] as const;

export type ExportModule = (typeof EXPORT_MODULES)[number];
