import type { NotificationModule, NotificationPriority, NotificationStatus } from "@/types/notifications";

export type CeoNotificationCategory =
  | "executive_approvals"
  | "payroll"
  | "recruitment"
  | "performance"
  | "attendance"
  | "organization"
  | "security"
  | "system"
  | "announcements"
  | "company_events";

export type CeoNotificationListParams = {
  page: number;
  pageSize: number;
  category?: CeoNotificationCategory;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export type CeoNotificationFilterLookups = {
  departments: { id: string; label: string }[];
};

export type CeoNotificationKpis = {
  totalNotifications: number;
  unread: number;
  highPriority: number;
  pendingApprovals: number;
  systemAlerts: number;
  companyAnnouncements: number;
  recruitmentAlerts: number;
  payrollAlerts: number;
};

export type CeoNotificationListItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  module: NotificationModule;
  category: CeoNotificationCategory;
  categoryLabel: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  departmentId: string | null;
  departmentName: string | null;
  employeeId: string | null;
  employeeName: string | null;
  generatedByName: string | null;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  metadata: Record<string, unknown>;
};

export type CeoNotificationListResult = {
  data: CeoNotificationListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CeoNotificationCategoryCount = {
  category: CeoNotificationCategory;
  label: string;
  count: number;
};

export type CeoNotificationAlertGroup = {
  alertType: string;
  label: string;
  count: number;
  items: CeoNotificationListItem[];
};

export type CeoNotificationAnnouncementItem = {
  id: string;
  title: string;
  message: string;
  category: CeoNotificationCategory;
  categoryLabel: string;
  createdAt: string;
  priority: NotificationPriority;
  status: NotificationStatus;
};

export type CeoNotificationTimelineEvent = {
  id: string;
  label: string;
  at: string;
  detail?: string;
};

export type CeoNotificationQuickAction = {
  id: string;
  label: string;
  href: string;
};

export type CeoNotificationDetail = {
  item: CeoNotificationListItem;
  relatedModuleLabel: string;
  timeline: CeoNotificationTimelineEvent[];
  supportingInfo: { label: string; value: string }[];
  quickActions: CeoNotificationQuickAction[];
};

export type CeoNotificationsPageData = {
  kpis: CeoNotificationKpis;
  categories: CeoNotificationCategoryCount[];
  list: CeoNotificationListResult;
  alerts: CeoNotificationAlertGroup[];
  announcements: CeoNotificationAnnouncementItem[];
  lookups: CeoNotificationFilterLookups;
};

export type CeoNotificationsActionResult =
  | { success: true; message: string }
  | { success: false; message: string };
