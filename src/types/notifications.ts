export type NotificationStatus = "unread" | "read" | "archived";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export type NotificationModule =
  | "system"
  | "attendance"
  | "leave"
  | "payroll"
  | "recruitment"
  | "performance"
  | "documents"
  | "assets"
  | "exit"
  | "reports"
  | "security";

export type NotificationChannel = "in_app" | "email" | "push";

export type DeliveryStatus = "pending" | "delivered" | "failed" | "skipped";

export type NotificationSoundTone = "classic" | "soft" | "alert" | "off";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  module: NotificationModule;
  priority: NotificationPriority;
  recipientName: string | null;
  employeeId: string | null;
  userId: string;
  status: NotificationStatus;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
};

export type NotificationListResult = {
  items: NotificationListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type NotificationDashboardStats = {
  unread: number;
  todayCount: number;
  criticalAlerts: number;
  failedDeliveries: number;
  emailQueue: number;
  recentCritical: NotificationListItem[];
};

export type NotificationTemplateItem = {
  id: string;
  templateKey: string;
  name: string;
  module: NotificationModule;
  subject: string;
  bodyTemplate: string;
  variables: string[];
  status: string;
  updatedAt: string;
};

export type NotificationTypeChannelSettings = {
  inApp: boolean;
  email: boolean;
  push: boolean;
};

export type NotificationSettings = {
  id: string;
  typeSettings: Record<NotificationModule, NotificationTypeChannelSettings>;
};

export type NotificationUserPreferences = {
  id: string | null;
  receiveEmail: boolean;
  receiveInApp: boolean;
  muteNotifications: boolean;
  notificationSound: NotificationSoundTone;
  dailyDigest: boolean;
  weeklyDigest: boolean;
};

export type NotificationBellItem = {
  id: string;
  title: string;
  message: string;
  module: NotificationModule;
  priority: NotificationPriority;
  status: NotificationStatus;
  actionUrl: string | null;
  createdAt: string;
};

export type NotificationBellData = {
  unreadCount: number;
  items: NotificationBellItem[];
  soundEnabled: boolean;
  notificationSound: NotificationSoundTone;
};

export type NotificationActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; message: string };

export type NotificationHistoryParams = {
  page?: number;
  pageSize?: number;
  employeeId?: string;
  module?: NotificationModule;
  type?: string;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};
