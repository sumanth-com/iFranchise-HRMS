import { hasAnyPermission } from "@/lib/permissions/utils";
import type { NotificationModule, NotificationPriority } from "@/types/notifications";

export const NOTIFICATIONS_ROUTES = {
  dashboard: "/dashboard/notifications",
  center: "/dashboard/notifications/center",
  history: "/dashboard/notifications/history",
  templates: "/dashboard/notifications/templates",
  settings: "/dashboard/notifications/settings",
  preferences: "/dashboard/notifications/preferences",
} as const;

export const NOTIFICATIONS_SUB_NAV = [
  { title: "Dashboard", href: NOTIFICATIONS_ROUTES.dashboard },
  { title: "Notification Center", href: NOTIFICATIONS_ROUTES.center },
  { title: "History", href: NOTIFICATIONS_ROUTES.history },
  { title: "Templates", href: NOTIFICATIONS_ROUTES.templates, admin: true },
  { title: "Settings", href: NOTIFICATIONS_ROUTES.settings, admin: true },
  { title: "Preferences", href: NOTIFICATIONS_ROUTES.preferences },
] as const;

export const NOTIFICATION_VIEW_PERMISSIONS = [
  "notifications.view",
  "notification.view",
] as const;

export const NOTIFICATION_MANAGE_PERMISSIONS = [
  "notifications.manage",
  "notification.manage",
] as const;

export const NOTIFICATION_SETTINGS_PERMISSIONS = [
  "notifications.settings",
  "notifications.manage",
  "notification.manage",
] as const;

export const NOTIFICATION_MODULES: { value: NotificationModule; label: string }[] = [
  { value: "system", label: "System" },
  { value: "attendance", label: "Attendance" },
  { value: "leave", label: "Leave" },
  { value: "payroll", label: "Payroll" },
  { value: "recruitment", label: "Recruitment" },
  { value: "performance", label: "Performance" },
  { value: "documents", label: "Documents" },
  { value: "assets", label: "Assets" },
  { value: "exit", label: "Exit" },
  { value: "reports", label: "Reports" },
  { value: "security", label: "Security" },
];

export const NOTIFICATION_PRIORITIES: { value: NotificationPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const NOTIFICATION_CENTER_TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
] as const;

export type NotificationCenterTab = (typeof NOTIFICATION_CENTER_TABS)[number]["value"];

export const DEFAULT_CHANNEL_SETTINGS = {
  inApp: true,
  email: true,
  push: false,
} as const;

export function canViewNotifications(codes: string[]) {
  return hasAnyPermission(codes, [...NOTIFICATION_VIEW_PERMISSIONS]);
}

export function canManageNotifications(codes: string[]) {
  return hasAnyPermission(codes, [...NOTIFICATION_MANAGE_PERMISSIONS]);
}

export function canManageNotificationSettings(codes: string[]) {
  return hasAnyPermission(codes, [...NOTIFICATION_SETTINGS_PERMISSIONS]);
}

export function formatNotificationModule(module: NotificationModule) {
  return NOTIFICATION_MODULES.find((m) => m.value === module)?.label ?? module;
}

export function formatNotificationPriority(priority: NotificationPriority) {
  return NOTIFICATION_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
}
