import { z } from "zod";

export const ceoProfilePersonalSchema = z.object({
  phone: z.string().max(30).optional().or(z.literal("")),
  personalEmail: z.string().email().optional().or(z.literal("")),
  personalPhone: z.string().max(30).optional().or(z.literal("")),
  bio: z.string().max(1000).optional().or(z.literal("")),
});

export const ceoProfilePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.string().min(2).max(20),
  timezone: z.string().min(1).max(80),
  dateFormat: z.string().min(1).max(40),
  timeFormat: z.enum(["12h", "24h"]),
  defaultDashboard: z.string().min(1).max(200),
  defaultLandingPage: z.string().min(1).max(200),
  sidebarState: z.enum(["expanded", "collapsed"]),
  notificationSound: z.enum(["classic", "soft", "alert", "off"]),
});

export const ceoAlertPreferencesSchema = z.object({
  executiveAlerts: z.boolean(),
  payrollAlerts: z.boolean(),
  recruitmentAlerts: z.boolean(),
  attendanceAlerts: z.boolean(),
  performanceAlerts: z.boolean(),
  approvals: z.boolean(),
  companyAnnouncements: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  desktopNotifications: z.boolean(),
});

export const ceoChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ceoSessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

export const ceoMfaToggleSchema = z.object({
  enable: z.boolean(),
});
