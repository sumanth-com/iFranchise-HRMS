import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { ASSETS_ROUTES } from "@/lib/assets/constants";
import { AUDIT_ROUTES } from "@/lib/audit/constants";
import { COMPANY_SETTINGS_ROUTES } from "@/lib/company-settings/constants";
import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { EXIT_ROUTES } from "@/lib/exit/constants";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { NOTIFICATIONS_ROUTES } from "@/lib/notifications/constants";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { REPORTS_ROUTES } from "@/lib/reports/constants";
import { ROLES_ROUTES } from "@/lib/roles/constants";

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
    label: "Attendance",
    description: "Daily presence and records",
    href: ATTENDANCE_ROUTES.list,
    keywords: ["attendance", "present", "absent", "late", "punch"],
    permission: "attendance.view",
  },
  {
    id: "leave",
    label: "Leave",
    description: "Requests and approvals",
    href: LEAVE_ROUTES.list,
    keywords: ["leave", "time off", "vacation", "approval", "pending"],
    permission: "leave.view",
  },
  {
    id: "leave-new",
    label: "Apply Leave",
    description: "Submit a leave request",
    href: LEAVE_ROUTES.new,
    keywords: ["apply leave", "request leave", "time off"],
    permission: "leave.create",
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
    label: "Payroll",
    description: "Salary processing overview",
    href: PAYROLL_ROUTES.dashboard,
    keywords: ["payroll", "salary", "payslip", "wage"],
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
    label: "Documents",
    description: "Employee documents hub",
    href: DOCUMENTS_ROUTES.dashboard,
    keywords: ["document", "files", "papers"],
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
    label: "Assets",
    description: "Asset inventory and assignments",
    href: ASSETS_ROUTES.dashboard,
    keywords: ["asset", "laptop", "device", "inventory"],
    permission: "asset.view",
  },
  {
    id: "exit",
    label: "Exit Management",
    description: "Resignations and clearance",
    href: EXIT_ROUTES.dashboard,
    keywords: ["exit", "resignation", "clearance", "offboard"],
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
    label: "Roles & Permissions",
    description: "Access control",
    href: ROLES_ROUTES.dashboard,
    keywords: ["role", "permission", "access"],
    permission: "role.view",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alerts and templates",
    href: NOTIFICATIONS_ROUTES.dashboard,
    keywords: ["notification", "alert", "message"],
    permission: "notification.view",
  },
  {
    id: "audit",
    label: "Audit Logs",
    description: "System activity history",
    href: AUDIT_ROUTES.logs,
    keywords: ["audit", "log", "history", "activity"],
    permission: "audit.view",
  },
  {
    id: "settings",
    label: "Company Settings",
    description: "Organization configuration",
    href: COMPANY_SETTINGS_ROUTES.base,
    keywords: ["settings", "company", "config"],
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
