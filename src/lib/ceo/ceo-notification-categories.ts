import { CEO_ROUTES } from "@/lib/ceo/constants";
import type {
  CeoNotificationCategory,
  CeoNotificationListItem,
  CeoNotificationQuickAction,
} from "@/types/ceo-notifications";
import type { NotificationModule, NotificationPriority } from "@/types/notifications";

export const CEO_NOTIFICATION_CATEGORIES = [
  "executive_approvals",
  "payroll",
  "recruitment",
  "performance",
  "attendance",
  "organization",
  "security",
  "system",
  "announcements",
  "company_events",
] as const satisfies readonly CeoNotificationCategory[];

export const CEO_NOTIFICATION_CATEGORY_LABELS: Record<CeoNotificationCategory, string> = {
  executive_approvals: "Executive Approvals",
  payroll: "Payroll",
  recruitment: "Recruitment",
  performance: "Performance",
  attendance: "Attendance",
  organization: "Organization",
  security: "Security",
  system: "System",
  announcements: "Announcements",
  company_events: "Company Events",
};

export const CEO_NOTIFICATION_ALERT_TYPES = [
  "critical_system",
  "payroll_delays",
  "large_resignations",
  "department_performance_drops",
  "hiring_delays",
  "high_attrition",
  "security_alerts",
  "pending_executive_approvals",
  "policy_expiry",
  "compliance_warnings",
] as const;

export const CEO_NOTIFICATION_ALERT_LABELS: Record<
  (typeof CEO_NOTIFICATION_ALERT_TYPES)[number],
  string
> = {
  critical_system: "Critical System Alerts",
  payroll_delays: "Payroll Delays",
  large_resignations: "Large Resignations",
  department_performance_drops: "Department Performance Drops",
  hiring_delays: "Hiring Delays",
  high_attrition: "High Attrition",
  security_alerts: "Security Alerts",
  pending_executive_approvals: "Pending Executive Approvals",
  policy_expiry: "Policy Expiry",
  compliance_warnings: "Compliance Warnings",
};

const ANNOUNCEMENT_HINTS =
  /announcement|board meeting|leadership meeting|policy update|holiday|company event|town hall/i;

const EXECUTIVE_TYPE_HINTS =
  /executive_|announcement|policy|compliance|board|holiday|attrition|resignation|security|payroll_delay|hiring_delay/i;

export function resolveCeoNotificationCategory(
  type: string,
  module: NotificationModule,
  actionUrl: string | null,
  title?: string,
  message?: string,
): CeoNotificationCategory {
  const haystack = `${type} ${title ?? ""} ${message ?? ""}`;

  if (
    type.startsWith("executive_approval") ||
    actionUrl?.includes(CEO_ROUTES.approvals)
  ) {
    return "executive_approvals";
  }

  if (/board meeting|leadership meeting|company event|town hall/i.test(haystack)) {
    return "company_events";
  }

  if (ANNOUNCEMENT_HINTS.test(haystack) || type.includes("announcement")) {
    return "announcements";
  }

  if (module === "payroll" || actionUrl?.includes(CEO_ROUTES.payroll)) return "payroll";
  if (module === "recruitment" || actionUrl?.includes(CEO_ROUTES.recruitment)) {
    return "recruitment";
  }
  if (module === "performance" || actionUrl?.includes(CEO_ROUTES.performance)) {
    return "performance";
  }
  if (
    module === "attendance" ||
    module === "leave" ||
    actionUrl?.includes(CEO_ROUTES.attendance)
  ) {
    return "attendance";
  }
  if (module === "security") return "security";
  if (
    module === "exit" ||
    module === "documents" ||
    actionUrl?.includes(CEO_ROUTES.organization)
  ) {
    return "organization";
  }

  return "system";
}

export function isExecutiveNotification(input: {
  type: string;
  module: NotificationModule;
  priority: NotificationPriority;
  actionUrl: string | null;
  title?: string;
  message?: string;
}) {
  if (input.priority === "high" || input.priority === "critical") return true;
  if (input.actionUrl?.startsWith("/ceo")) return true;
  if (EXECUTIVE_TYPE_HINTS.test(`${input.type} ${input.title ?? ""} ${input.message ?? ""}`)) {
    return true;
  }

  return (
    input.module === "payroll" ||
    input.module === "recruitment" ||
    input.module === "performance" ||
    input.module === "attendance" ||
    input.module === "security" ||
    input.module === "reports" ||
    input.module === "exit"
  );
}

export function resolveAlertType(
  item: Pick<CeoNotificationListItem, "type" | "module" | "priority" | "title" | "category">,
): (typeof CEO_NOTIFICATION_ALERT_TYPES)[number] | null {
  const haystack = `${item.type} ${item.title}`.toLowerCase();

  if (item.category === "executive_approvals" || haystack.includes("executive_approval")) {
    return "pending_executive_approvals";
  }
  if (item.module === "security" || haystack.includes("security")) return "security_alerts";
  if (haystack.includes("payroll") && /delay|late|overdue|failed/i.test(haystack)) {
    return "payroll_delays";
  }
  if (/resign|resignation/i.test(haystack)) return "large_resignations";
  if (/attrition/i.test(haystack)) return "high_attrition";
  if (/hiring|recruit/i.test(haystack) && /delay|overdue|stalled/i.test(haystack)) {
    return "hiring_delays";
  }
  if (/performance/i.test(haystack) && /drop|decline|below/i.test(haystack)) {
    return "department_performance_drops";
  }
  if (/policy/i.test(haystack) && /expir/i.test(haystack)) return "policy_expiry";
  if (/compliance/i.test(haystack)) return "compliance_warnings";
  if (item.priority === "critical" || item.module === "system") return "critical_system";

  return null;
}

export function isAnnouncementCategory(category: CeoNotificationCategory) {
  return category === "announcements" || category === "company_events";
}

export function buildQuickActions(
  item: Pick<
    CeoNotificationListItem,
    "category" | "actionUrl" | "employeeId" | "departmentId" | "module"
  >,
): CeoNotificationQuickAction[] {
  const actions: CeoNotificationQuickAction[] = [];
  const seen = new Set<string>();

  function push(action: CeoNotificationQuickAction) {
    if (seen.has(action.id)) return;
    seen.add(action.id);
    actions.push(action);
  }

  if (item.actionUrl) {
    const label =
      item.category === "executive_approvals"
        ? "Open Approval"
        : item.category === "payroll"
          ? "Open Payroll"
          : item.category === "recruitment"
            ? "Open Recruitment"
            : item.category === "performance"
              ? "Open Performance"
              : item.category === "attendance"
                ? "Open Attendance"
                : "Open Related Module";
    push({ id: "open-related", label, href: item.actionUrl });
  }

  if (item.departmentId) {
    push({
      id: "view-department",
      label: "View Department",
      href: `${CEO_ROUTES.organization}?departmentId=${item.departmentId}`,
    });
  }

  if (item.employeeId) {
    push({
      id: "view-employee",
      label: "View Employee",
      href: `${CEO_ROUTES.organization}?employeeId=${item.employeeId}`,
    });
  }

  if (item.category === "executive_approvals" && !item.actionUrl) {
    push({ id: "open-approvals", label: "Open Approval", href: CEO_ROUTES.approvals });
  }
  if (item.category === "payroll" && !item.actionUrl) {
    push({ id: "open-payroll", label: "Open Payroll", href: CEO_ROUTES.payroll });
  }
  if (item.category === "recruitment" && !item.actionUrl) {
    push({ id: "open-recruitment", label: "Open Recruitment", href: CEO_ROUTES.recruitment });
  }
  if (item.category === "performance" && !item.actionUrl) {
    push({ id: "open-performance", label: "Open Performance", href: CEO_ROUTES.performance });
  }
  if (item.category === "attendance" && !item.actionUrl) {
    push({ id: "open-attendance", label: "Open Attendance", href: CEO_ROUTES.attendance });
  }
  if (item.module === "reports") {
    push({ id: "open-reports", label: "Open Reports", href: CEO_ROUTES.reports });
  }

  return actions;
}
