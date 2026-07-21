import { ASSETS_ROUTES, SELF_ASSETS_ROUTES, assetsTeamListUrl } from "@/lib/assets/constants";
import { AUDIT_ROUTES } from "@/lib/audit/constants";
import { COMPANY_SETTINGS_ROUTES } from "@/lib/company-settings/constants";
import { DOCUMENTS_ROUTES, SELF_DOCUMENTS_ROUTES, documentsTeamListUrl } from "@/lib/documents/constants";
import { HR_OVERVIEW_ROUTES } from "@/lib/dashboard/constants";
import { USER_PROVISIONING_ROUTES } from "@/lib/user-provisioning/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { EXIT_ROUTES } from "@/lib/exit/constants";
import { LEAVE_ROUTES, SELF_LEAVE_ROUTES, leaveTeamListUrl } from "@/lib/leave/constants";
import { NOTIFICATIONS_ROUTES } from "@/lib/notifications/constants";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import { PAYROLL_ROUTES, SELF_PAYROLL_ROUTES, payrollTeamListUrl } from "@/lib/payroll/constants";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { REPORTS_ROUTES } from "@/lib/reports/constants";
import { ROLES_ROUTES } from "@/lib/roles/constants";
import { ATTENDANCE_ROUTES, SELF_ATTENDANCE_ROUTES, attendanceTeamListUrl } from "@/lib/attendance/constants";

export type DashboardSearchItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  keywords: string[];
  permission?: string;
};

/** Global HR command/search catalog for the dashboard. */
export const DASHBOARD_SEARCH_CATALOG: DashboardSearchItem[] = [
  {
    id: "hr-overview",
    label: "HR Overview",
    description: "Organization metrics, priorities, and workforce insights",
    href: HR_OVERVIEW_ROUTES.overview,
    keywords: ["hr overview", "dashboard", "organization", "metrics", "insights", "workforce"],
    permission: "employee.view",
  },
  {
    id: "employees",
    label: "Employees",
    description: "Workforce directory",
    href: EMPLOYEE_ROUTES.list,
    keywords: ["employee", "staff", "people", "directory", "team"],
    permission: "employee.view",
  },
  {
    id: "employees-new",
    label: "Add Employee",
    description: "Create a new employee record",
    href: EMPLOYEE_ROUTES.new,
    keywords: ["add", "create", "hire", "onboard", "new employee"],
    permission: "employee.create",
  },
  {
    id: "attendance",
    label: "My Attendance",
    description: "Your personal attendance and check-ins",
    href: SELF_ATTENDANCE_ROUTES.list,
    keywords: ["attendance", "my attendance", "present", "punch", "check in"],
    permission: "attendance.view",
  },
  {
    id: "attendance-management",
    label: "Team Attendance",
    description: "Track attendance across the organization",
    href: attendanceTeamListUrl(),
    keywords: ["team attendance", "attendance", "absent", "late", "workforce presence"],
    permission: "attendance.view",
  },
  {
    id: "leave",
    label: "My Leave",
    description: "Your balances and leave requests",
    href: SELF_LEAVE_ROUTES.list,
    keywords: ["leave", "my leave", "time off", "vacation", "balance"],
    permission: "leave.view",
  },
  {
    id: "leave-new",
    label: "Apply Leave",
    description: "Submit your leave request",
    href: SELF_LEAVE_ROUTES.new,
    keywords: ["apply leave", "request leave", "time off"],
    permission: "leave.create",
  },
  {
    id: "leave-management",
    label: "Leave & Approvals",
    description: "Track leave across the organization",
    href: leaveTeamListUrl(),
    keywords: ["leave approvals", "leave admin", "pending leave", "workforce leave"],
    permission: "leave.view",
  },
  {
    id: "leave-balances",
    label: "Leave Balances",
    description: "Remaining leave balances",
    href: LEAVE_ROUTES.balances,
    keywords: ["balance", "quota", "remaining leave"],
    permission: "leave.view",
  },
  {
    id: "leave-calendar",
    label: "Leave Calendar",
    description: "Team leave calendar",
    href: LEAVE_ROUTES.calendar,
    keywords: ["calendar", "schedule", "planned leave"],
    permission: "leave.view",
  },
  {
    id: "payroll",
    label: "My Payroll",
    description: "Your salary, payslips, and payment history",
    href: SELF_PAYROLL_ROUTES.list,
    keywords: ["payroll", "my payroll", "salary", "payslip", "wage"],
    permission: "payroll.view",
  },
  {
    id: "payroll-management",
    label: "Payroll",
    description: "Salary processing across the organization",
    href: payrollTeamListUrl(),
    keywords: ["payroll", "run payroll", "compensation", "salary processing"],
    permission: "payroll.view",
  },
  {
    id: "payroll-run",
    label: "Run Payroll",
    description: "Start this month’s payroll run",
    href: PAYROLL_ROUTES.run,
    keywords: ["run payroll", "process payroll", "generate"],
    permission: "payroll.generate",
  },
  {
    id: "payslips",
    label: "Payslips",
    description: "Employee payslip records",
    href: PAYROLL_ROUTES.payslips,
    keywords: ["payslip", "salary slip"],
    permission: "payroll.view",
  },
  {
    id: "performance",
    label: "Performance",
    description: "Goals, KPIs, and reviews",
    href: PERFORMANCE_ROUTES.dashboard,
    keywords: ["performance", "review", "kpi", "goal"],
    permission: "performance.view",
  },
  {
    id: "recruitment",
    label: "Recruitment",
    description: "Hiring pipeline",
    href: RECRUITMENT_ROUTES.dashboard,
    keywords: ["recruitment", "hiring", "talent"],
    permission: "recruitment.view",
  },
  {
    id: "jobs",
    label: "Job Openings",
    description: "Open and draft roles",
    href: RECRUITMENT_ROUTES.jobs,
    keywords: ["job", "opening", "vacancy", "create job"],
    permission: "recruitment.view",
  },
  {
    id: "interviews",
    label: "Interviews",
    description: "Scheduled interviews",
    href: RECRUITMENT_ROUTES.interviews,
    keywords: ["interview", "candidate meeting"],
    permission: "recruitment.view",
  },
  {
    id: "offers",
    label: "Recruitment Offers",
    description: "Pending and sent offers",
    href: RECRUITMENT_ROUTES.offers,
    keywords: ["offer", "letter", "package"],
    permission: "recruitment.view",
  },
  {
    id: "documents",
    label: "My Documents",
    description: "Your personal and company documents",
    href: SELF_DOCUMENTS_ROUTES.list,
    keywords: ["document", "my documents", "files", "papers"],
    permission: "documents.view",
  },
  {
    id: "documents-management",
    label: "HR Documents",
    description: "Employee documents hub across the organization",
    href: documentsTeamListUrl(),
    keywords: ["hr documents", "employee files", "letters", "documents"],
    permission: "documents.view",
  },
  {
    id: "documents-expiring",
    label: "Expiring Documents",
    description: "Documents nearing expiry",
    href: DOCUMENTS_ROUTES.expiring,
    keywords: ["expiring", "expiry", "visa", "passport"],
    permission: "documents.view",
  },
  {
    id: "assets",
    label: "My Assets",
    description: "Assets assigned to you",
    href: SELF_ASSETS_ROUTES.list,
    keywords: ["asset", "my assets", "laptop", "device"],
    permission: "asset.view",
  },
  {
    id: "assets-management",
    label: "Company Assets",
    description: "Asset inventory and assignments",
    href: assetsTeamListUrl(),
    keywords: ["company assets", "inventory", "assignment", "assets"],
    permission: "asset.view",
  },
  {
    id: "exit",
    label: "Offboarding",
    description: "Resignations and clearance",
    href: EXIT_ROUTES.dashboard,
    keywords: ["offboarding", "exit", "resignation", "clearance"],
    permission: "exit.view",
  },
  {
    id: "reports",
    label: "Reports",
    description: "HR analytics and exports",
    href: REPORTS_ROUTES.dashboard,
    keywords: ["report", "analytics", "export"],
    permission: "reports.view",
  },
  {
    id: "organization",
    label: "Organization",
    description: "Branches, departments, holidays",
    href: ORGANIZATION_ROUTES.dashboard,
    keywords: ["organization", "department", "branch", "holiday"],
    permission: "organization.view",
  },
  {
    id: "roles",
    label: "Roles & Access",
    description: "Access control",
    href: ROLES_ROUTES.dashboard,
    keywords: ["roles", "access", "permission", "rbac"],
    permission: "role.view",
  },
  {
    id: "user-provisioning",
    label: "User Provisioning",
    description: "Invite and manage portal users, executives, and managers",
    href: USER_PROVISIONING_ROUTES.hr,
    keywords: ["user provisioning", "invite", "executive", "portal access", "manager invite"],
    permission: "user_provisioning.view",
  },
  {
    id: "notifications",
    label: "My Notifications",
    description: "Your personal notification inbox",
    href: NOTIFICATIONS_ROUTES.center,
    keywords: ["notification", "my notifications", "alert", "inbox"],
    permission: "notification.view",
  },
  {
    id: "notifications-management",
    label: "Alerts & Broadcasts",
    description: "Alerts, templates, and delivery settings",
    href: "/dashboard/notifications?tab=team",
    keywords: ["alerts", "broadcasts", "templates", "notifications admin"],
    permission: "notification.view",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Your appearance and notification preferences",
    href: "/dashboard/settings",
    keywords: ["settings", "preferences", "profile"],
  },
  {
    id: "audit",
    label: "Audit Trail",
    description: "System activity history",
    href: AUDIT_ROUTES.logs,
    keywords: ["audit trail", "audit", "log", "history", "activity"],
    permission: "audit.view",
  },
  {
    id: "settings",
    label: "Company Settings",
    description: "Organization profile, HR policies, and platform controls",
    href: COMPANY_SETTINGS_ROUTES.base,
    keywords: ["settings", "company", "config", "hr policies", "leave policy", "payroll settings"],
    permission: "settings.view",
  },
];

export function filterDashboardSearch(
  query: string,
  permissionCodes: string[],
  hasPermission: (codes: string[], permission: string) => boolean,
): DashboardSearchItem[] {
  const term = query.trim().toLowerCase();
  const allowed = DASHBOARD_SEARCH_CATALOG.filter(
    (item) => !item.permission || hasPermission(permissionCodes, item.permission),
  );

  if (!term) return allowed.slice(0, 8);

  return allowed
    .map((item) => {
      const haystack = [item.label, item.description, ...item.keywords]
        .join(" ")
        .toLowerCase();
      const score =
        (item.label.toLowerCase().startsWith(term) ? 3 : 0) +
        (item.label.toLowerCase().includes(term) ? 2 : 0) +
        (haystack.includes(term) ? 1 : 0);
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .slice(0, 8)
    .map((row) => row.item);
}
