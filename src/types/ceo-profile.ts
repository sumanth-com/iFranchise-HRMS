export type CeoProfileTheme = "light" | "dark" | "system";
export type CeoProfileTimeFormat = "12h" | "24h";
export type CeoProfileSidebarState = "expanded" | "collapsed";

export type CeoExecutiveProfile = {
  employeeId: string;
  userId: string;
  fullName: string;
  employeeCode: string;
  roleName: string;
  departmentName: string | null;
  email: string;
  phone: string | null;
  personalEmail: string | null;
  personalPhone: string | null;
  dateOfJoining: string | null;
  executiveLevel: string;
  reportingToName: string | null;
  employmentTypeName: string | null;
  branchName: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  profileImagePath: string | null;
};

export type CeoAccountInfo = {
  email: string;
  username: string;
  lastLoginAt: string | null;
  passwordLastChangedAt: string | null;
  twoFactorEnabled: boolean;
  twoFactorFactorId: string | null;
  activeSessionCount: number;
};

export type CeoUserPreferences = {
  theme: CeoProfileTheme;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: CeoProfileTimeFormat;
  defaultDashboard: string;
  defaultLandingPage: string;
  sidebarState: CeoProfileSidebarState;
  notificationSound: string;
};

export type CeoAlertPreferences = {
  executiveAlerts: boolean;
  payrollAlerts: boolean;
  recruitmentAlerts: boolean;
  attendanceAlerts: boolean;
  performanceAlerts: boolean;
  approvals: boolean;
  companyAnnouncements: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
};

export type CeoLoginSession = {
  id: string;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  ipAddress: string | null;
  location: string | null;
  loggedInAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
  isActive: boolean;
};

export type CeoCalendarEvent = {
  id: string;
  title: string;
  eventType:
    | "meeting"
    | "board_meeting"
    | "executive_review"
    | "scheduled_report"
    | "company_event";
  startsAt: string;
  endsAt: string | null;
  href: string | null;
};

export type CeoActivityItem = {
  id: string;
  label: string;
  description: string | null;
  occurredAt: string;
  module: string;
  action: string;
};

export type CeoProfilePageData = {
  profile: CeoExecutiveProfile;
  account: CeoAccountInfo;
  preferences: CeoUserPreferences;
  alertPreferences: CeoAlertPreferences;
  sessions: CeoLoginSession[];
  calendar: CeoCalendarEvent[];
  activity: CeoActivityItem[];
};

export type CeoProfileActionResult =
  | { success: true; message: string; data?: unknown }
  | { success: false; message: string };
