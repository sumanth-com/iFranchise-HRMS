export const CEO_ROUTES = {
  home: "/ceo",
  organization: "/ceo/organization",
  recruitment: "/ceo/recruitment",
  performance: "/ceo/performance",
  payroll: "/ceo/payroll",
  attendance: "/ceo/attendance",
  analytics: "/ceo/analytics",
  approvals: "/ceo/approvals",
  reports: "/ceo/reports",
  notifications: "/ceo/notifications",
  notificationsCenter: "/ceo/notifications/center",
  notificationsHistory: "/ceo/notifications/history",
  profile: "/ceo/profile",
  settings: "/ceo/profile",
} as const;

export const CEO_QUICK_ACTIONS = [
  {
    id: "create-department",
    label: "Create Department",
    description: "Review organization structure",
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
    id: "open-payroll",
    label: "Open Payroll",
    description: "Salary cost and status",
    href: CEO_ROUTES.payroll,
  },
  {
    id: "company-analytics",
    label: "Company Analytics",
    description: "Trends and executive charts",
    href: CEO_ROUTES.analytics,
  },
] as const;

export type CeoQuickActionId = (typeof CEO_QUICK_ACTIONS)[number]["id"];
