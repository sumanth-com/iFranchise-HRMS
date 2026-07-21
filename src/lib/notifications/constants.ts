import { hasAnyPermission } from "@/lib/permissions/utils";
import type { NotificationModule, NotificationPriority } from "@/types/notifications";
import type { NotificationSoundTone } from "@/types/notifications";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";

export const NOTIFICATIONS_ROUTES = {
  dashboard: "/dashboard/notifications",
  center: "/dashboard/notifications?tab=my",
  history: "/dashboard/notifications/history",
  templates: "/dashboard/notifications/templates",
  settings: "/dashboard/notifications/settings",
  preferences: "/dashboard/notifications/preferences",
} as const;

export const MANAGER_NOTIFICATIONS_ROUTES = {
  dashboard: MANAGER_ROUTES.notifications,
  center: MANAGER_ROUTES.notificationsCenter,
  history: MANAGER_ROUTES.notificationsHistory,
  preferences: `${MANAGER_ROUTES.settings}#notifications`,
} as const;

export const CEO_NOTIFICATIONS_ROUTES = {
  dashboard: CEO_ROUTES.notifications,
  center: CEO_ROUTES.notifications,
  history: CEO_ROUTES.notifications,
  preferences: `${CEO_ROUTES.profile}#notifications`,
} as const;

export type NotificationRouteSet = {
  dashboard: string;
  center: string;
  history: string;
  templates: string;
  settings: string;
  preferences: string;
};

export function getNotificationsRoutes(portalHome: string): NotificationRouteSet {
  if (portalHome.startsWith("/manager")) {
    return {
      dashboard: MANAGER_NOTIFICATIONS_ROUTES.dashboard,
      center: MANAGER_NOTIFICATIONS_ROUTES.center,
      history: MANAGER_NOTIFICATIONS_ROUTES.history,
      templates: NOTIFICATIONS_ROUTES.templates,
      settings: NOTIFICATIONS_ROUTES.settings,
      preferences: MANAGER_NOTIFICATIONS_ROUTES.preferences,
    };
  }

  if (portalHome.startsWith("/ceo")) {
    return {
      dashboard: CEO_NOTIFICATIONS_ROUTES.dashboard,
      center: CEO_NOTIFICATIONS_ROUTES.center,
      history: CEO_NOTIFICATIONS_ROUTES.history,
      templates: NOTIFICATIONS_ROUTES.templates,
      settings: NOTIFICATIONS_ROUTES.settings,
      preferences: CEO_NOTIFICATIONS_ROUTES.preferences,
    };
  }

  return NOTIFICATIONS_ROUTES;
}

export const NOTIFICATIONS_SUB_NAV = [
  { title: "My Notifications", href: "/dashboard/notifications?tab=my" },
  { title: "Alerts & Broadcasts", href: "/dashboard/notifications?tab=team", admin: true },
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

export const NOTIFICATION_SOUND_OPTIONS: {
  value: NotificationSoundTone;
  label: string;
  description: string;
  fileName: string | null;
}[] = [
  {
    value: "classic",
    label: "Soft Chime",
    description: "Gentle two-note tone for everyday alerts.",
    fileName: "notification-classic.wav",
  },
  {
    value: "soft",
    label: "Soft Ping",
    description: "Gentle sound for low-distraction environments.",
    fileName: "notification-soft.mp3",
  },
  {
    value: "alert",
    label: "Alert Bell",
    description: "Louder tone for urgent notifications.",
    fileName: "notification-alert.mp3",
  },
  {
    value: "off",
    label: "No sound",
    description: "Keep visual alerts only — no tone when notifications arrive.",
    fileName: null,
  },
];

export const DEFAULT_NOTIFICATION_SOUND: NotificationSoundTone = "classic";

export function getNotificationSoundUrl(tone: NotificationSoundTone) {
  if (tone === "off") return null;
  const option = NOTIFICATION_SOUND_OPTIONS.find((item) => item.value === tone);
  return `/sounds/${option?.fileName ?? NOTIFICATION_SOUND_OPTIONS[0]!.fileName}`;
}

export function parseNotificationSoundTone(value: string | null | undefined): NotificationSoundTone {
  if (value === "soft" || value === "alert" || value === "classic" || value === "off") {
    return value;
  }
  return DEFAULT_NOTIFICATION_SOUND;
}

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

const NOTIFICATION_MESSAGE_FALLBACKS: Record<string, string> = {
  "Your performance review is due by {{dueDate}}.":
    "A performance review is pending your action.",
};

export function formatNotificationDisplayText(text: string) {
  const trimmed = text.trim();
  if (NOTIFICATION_MESSAGE_FALLBACKS[trimmed]) {
    return NOTIFICATION_MESSAGE_FALLBACKS[trimmed];
  }
  if (!/\{\{\w+\}\}/.test(text)) return text;

  return text
    .replace(/\{\{\w+\}\}/g, "")
    .replace(/\sby\s*\./gi, ".")
    .replace(/\s+/g, " ")
    .trim();
}
