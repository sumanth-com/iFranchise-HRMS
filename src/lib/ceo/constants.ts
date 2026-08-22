export const CEO_ROUTES = {
  home: "/ceo",
  organization: "/ceo/organization",
  organizationProfile: "/ceo/organization/profile",
  recruitment: "/ceo/recruitment",
  performance: "/ceo/performance",
  performanceGoals: "/ceo/performance/goals",
  payroll: "/ceo/payroll",
  attendance: "/ceo/attendance",
  leave: "/ceo/leave",
  exit: "/ceo/exit",
  analytics: "/ceo/analytics",
  approvals: "/ceo/approvals",
  approvalsLeave: "/ceo/approvals/leave",
  approvalsRegularization: "/ceo/approvals/regularization",
  approvalsExit: "/ceo/approvals/exit",
  reports: "/ceo/reports",
  notifications: "/ceo/notifications",
  notificationsCenter: "/ceo/notifications/center",
  notificationsHistory: "/ceo/notifications/history",
  userProvisioning: "/ceo/user-provisioning",
  profile: "/ceo/profile",
  settings: "/ceo/settings",
} as const;

export const CEO_QUICK_ACTIONS = [
  {
    id: "create-department",
    label: "View Organization",
    description: "Company structure and departments",
    href: CEO_ROUTES.organization,
  },
  {
    id: "view-reports",
    label: "View Reports",
    description: "Company-wide analytics",
    href: CEO_ROUTES.reports,
  },
  {
    id: "view-organization",
    label: "View Organization",
    description: "Headcount and hierarchy",
    href: CEO_ROUTES.organization,
  },
  {
    id: "open-recruitment",
    label: "Open Recruitment",
    description: "Hiring pipeline overview",
    href: CEO_ROUTES.recruitment,
  },
  {
    id: "company-analytics",
    label: "Company Analytics",
    description: "Trends and executive charts",
    href: CEO_ROUTES.analytics,
  },
] as const;

export type CeoQuickActionId = (typeof CEO_QUICK_ACTIONS)[number]["id"];

export const CEO_APPROVALS_SUB_NAV = [
  { title: "Executive", href: CEO_ROUTES.approvals },
  { title: "Leave", href: CEO_ROUTES.approvalsLeave },
  { title: "Regularization", href: CEO_ROUTES.approvalsRegularization },
  { title: "Exit", href: CEO_ROUTES.approvalsExit },
] as const;

export const CEO_ANALYTICS_SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "workforce", title: "Workforce" },
  { id: "hiring", title: "Hiring" },
  { id: "attendance", title: "Attendance" },
  { id: "performance", title: "Performance" },
  { id: "payroll", title: "Payroll" },
] as const;

export type CeoAnalyticsSectionId = (typeof CEO_ANALYTICS_SECTIONS)[number]["id"];
