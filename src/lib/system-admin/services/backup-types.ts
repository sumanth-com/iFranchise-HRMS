/** Client-safe backup types and UI constants (no server-only imports). */

export const BACKUP_TYPES = [
  "full",
  "employees",
  "payroll",
  "attendance",
  "leave",
  "performance",
  "recruitment",
  "documents",
  "assets",
  "organization",
  "settings",
  "permissions",
  "audit_logs",
  "database",
] as const;

export type BackupType = (typeof BACKUP_TYPES)[number];

/** UI-facing scopes mapped to existing backup_type values. */
export const BACKUP_SCOPE_OPTIONS = [
  {
    id: "full",
    label: "Full System Backup",
    description: "Employees, payroll, HR records, documents, and configuration",
  },
  {
    id: "employees",
    label: "Employee Data",
    description: "Employee directory and profile records",
  },
  {
    id: "payroll",
    label: "Payroll Data",
    description: "Payroll runs, payslips, and salary structures",
  },
  {
    id: "documents",
    label: "HR & Documents",
    description: "Employee document metadata and references",
  },
  {
    id: "database",
    label: "Database Only",
    description: "Roles, permissions, org structure, and system settings",
  },
] as const satisfies ReadonlyArray<{
  id: BackupType;
  label: string;
  description: string;
}>;

export type BackupJobRow = {
  id: string;
  backupType: string;
  format: string;
  status: string;
  storagePath: string | null;
  fileSizeBytes: number | null;
  durationMs: number | null;
  recordCount: number | null;
  /** User-facing summary only — never a raw SQL/Postgres message. */
  errorMessage: string | null;
  /** Raw diagnostics for collapsed “Technical Details” only. */
  technicalDetails: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type BackupScheduleFrequency = "hourly" | "daily" | "weekly";

export type BackupOperationsSnapshot = {
  jobs: BackupJobRow[];
  lastSuccessfulAt: string | null;
  nextScheduledAt: string | null;
  scheduleFrequency: BackupScheduleFrequency;
  scheduleLabel: string;
  retentionDays: number;
  status: "healthy" | "attention" | "failed" | "idle";
  totalBackupBytes: number;
  completedCount: number;
  failedCount: number;
  storageUsageLabel: string;
};

const TECHNICAL_ERROR_PATTERN =
  /does not exist|column |relation |permission denied|postgres|pgrst|supabase|stack|exception|sqlstate|mime type|violates|foreign key|timeout|ECONN|fetch failed|jwt|row-level|rls|schema cache|could not find the table/i;

/** True when a stored message looks like a raw system/DB error. */
export function isTechnicalBackupError(message: string | null | undefined): boolean {
  if (!message) return false;
  if (message.startsWith("Backup could not")) return false;
  if (message.startsWith("The backup could not")) return false;
  return TECHNICAL_ERROR_PATTERN.test(message) || /^[a-z_]+:\s/i.test(message.trim());
}

export function getBackupFailureIssue(): string {
  return "The backup could not be completed due to a system configuration issue.";
}

export function getBackupFailureAction(): string {
  return "Please review the system configuration and try again.";
}

/** Map any backend/DB error into a short UI-safe summary. */
export function toFriendlyBackupError(message: string | null | undefined): string {
  if (!message) return getBackupFailureIssue();
  if (!isTechnicalBackupError(message) && message.startsWith("Backup could not")) {
    return message;
  }
  const lower = message.toLowerCase();
  if (lower.includes("already in progress")) {
    return "Backup could not complete because another backup is already running.";
  }
  if (lower.includes("mime type") || lower.includes("not supported")) {
    return "Backup could not complete because storage rejected the export file type.";
  }
  if (lower.includes("organization_id") || lower.includes("does not exist") || lower.includes("column")) {
    return "Backup could not be completed because of a database configuration issue.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Backup could not complete because the export took too long. Try a smaller scope.";
  }
  if (lower.includes("too large") || lower.includes("maximum") || lower.includes("payload")) {
    return "Backup could not complete because the export exceeds storage limits.";
  }
  if (lower.includes("empty")) {
    return "Backup could not complete because no exportable data was produced.";
  }
  return getBackupFailureIssue();
}
