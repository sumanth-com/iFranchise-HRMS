export type AuditEventStatus = "success" | "failed";

export type AuditPriority = "low" | "medium" | "high" | "critical";

export type AuditModule =
  | "dashboard"
  | "employees"
  | "attendance"
  | "leave"
  | "payroll"
  | "performance"
  | "recruitment"
  | "documents"
  | "assets"
  | "exit"
  | "reports"
  | "organization"
  | "roles"
  | "notifications"
  | "settings";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "assign"
  | "login"
  | "logout"
  | "export"
  | "import"
  | "password_reset"
  | "role_change"
  | "permission_change";

export type AuditListItem = {
  id: string;
  occurredAt: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  roleName: string | null;
  module: string;
  action: string;
  recordId: string;
  tableName: string;
  description: string | null;
  ipAddress: string | null;
  deviceType: string | null;
  browser: string | null;
  eventStatus: AuditEventStatus;
  priority: AuditPriority;
};

export type AuditListResult = {
  items: AuditListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AuditDetail = AuditListItem & {
  operatingSystem: string | null;
  userAgent: string | null;
  reason: string | null;
  oldRecord: Record<string, unknown> | null;
  newRecord: Record<string, unknown> | null;
  operation: string;
};

export type AuditDashboardStats = {
  totalToday: number;
  criticalActions: number;
  failedActions: number;
  loginEvents: number;
  recentChanges: AuditListItem[];
  topActiveUsers: { userId: string; userName: string; count: number }[];
  activityByModule: { module: string; count: number }[];
  activityTimeline: { date: string; count: number }[];
  activityByUser: { userId: string; userName: string; count: number }[];
};

export type AuditSettings = {
  id: string;
  retentionDays: number;
};

export type AuditHistoryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  userId?: string;
  roleId?: string;
  module?: string;
  action?: string;
  status?: AuditEventStatus;
  priority?: AuditPriority;
  dateFrom?: string;
  dateTo?: string;
};

export type AuditExportFormat = "csv" | "excel" | "pdf";

export type AuditActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };
