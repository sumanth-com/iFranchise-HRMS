import { CEO_ROUTES } from "@/lib/ceo/constants";
import { HR_PORTAL_HOME } from "@/lib/auth/portal-paths";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { navTourSelector, TOUR_TARGETS } from "@/lib/product-tour/constants";
import type { TourDefinition } from "@/lib/product-tour/types";
import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";

const HR_EMPLOYEES = "/dashboard/employees";
const HR_RECRUITMENT = "/dashboard/recruitment";
const HR_LEAVE = HR_HUB_ROUTES.teamLeave;

export const PRODUCT_TOURS: TourDefinition[] = [
  {
    id: "hr_portal_v1",
    portal: "hr",
    title: "HR Portal overview",
    routeMatch: HR_PORTAL_HOME,
    autoStart: true,
    steps: [
      {
        id: "welcome",
        title: "Welcome to your HR portal",
        description:
          "This short tour shows where to find navigation, your dashboard, and everyday actions. You can skip anytime.",
      },
      {
        id: "navigation",
        title: "Your navigation",
        description:
          "Use the sidebar for self-service tools and Administration modules such as employees, recruitment, and team leave.",
        target: TOUR_TARGETS.sidebar,
        placement: "right",
      },
      {
        id: "dashboard",
        title: "Your dashboard",
        description:
          "See your key HR information, pending actions, and important updates in one place.",
        target: TOUR_TARGETS.dashboardKpis,
        placement: "bottom",
      },
      {
        id: "notifications",
        title: "Stay informed",
        description:
          "Open notifications for approvals, payroll updates, and company announcements.",
        target: TOUR_TARGETS.notifications,
        placement: "bottom",
      },
      {
        id: "account",
        title: "Account and help",
        description:
          "Open your profile menu for Help, settings, theme, and sign out.",
        target: TOUR_TARGETS.userMenu,
        placement: "bottom",
      },
      {
        id: "complete",
        title: "You're all set",
        description:
          "You now know the basics of your HRMS portal. Restart this tour anytime from Help.",
      },
    ],
  },
  {
    id: "hr_employees_v1",
    portal: "hr",
    title: "Employees module",
    routeMatch: HR_EMPLOYEES,
    routePrefix: true,
    autoStart: true,
    permissions: ["employee.view"],
    steps: [
      {
        id: "intro",
        title: "Employee management",
        description:
          "Browse, search, and open employee profiles. This is your starting point for HR records.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "Quick access",
        description:
          "Return to Employees anytime from the sidebar under Administration.",
        target: navTourSelector(HR_EMPLOYEES),
        placement: "right",
      },
      {
        id: "complete",
        title: "Ready to manage people",
        description:
          "Open a profile to update details, documents, provisioning, and employment information.",
      },
    ],
  },
  {
    id: "hr_recruitment_v1",
    portal: "hr",
    title: "Recruitment module",
    routeMatch: HR_RECRUITMENT,
    routePrefix: true,
    autoStart: true,
    permissions: ["recruitment.view"],
    steps: [
      {
        id: "intro",
        title: "Recruitment workspace",
        description:
          "Track jobs, candidates, interviews, and offers from a single module.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "Recruitment in the sidebar",
        description: "Open Recruitment under Administration whenever you need the hiring pipeline.",
        target: navTourSelector(HR_RECRUITMENT),
        placement: "right",
      },
      {
        id: "complete",
        title: "Hiring at a glance",
        description:
          "Use dashboards and lists to move candidates forward without losing context.",
      },
    ],
  },
  {
    id: "hr_team_leave_v1",
    portal: "hr",
    title: "Team leave",
    routeMatch: HR_LEAVE,
    routePrefix: true,
    autoStart: true,
    permissions: ["leave.view"],
    steps: [
      {
        id: "intro",
        title: "Team leave",
        description:
          "Review org-wide leave requests, balances, and approvals. My Leave is for your personal requests only.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "Team Leave vs My Leave",
        description:
          "Team Leave lives under Administration. My Leave under Self-service is only for your own time off.",
        target: navTourSelector(HR_LEAVE),
        placement: "right",
      },
      {
        id: "complete",
        title: "Leave oversight",
        description:
          "Filter by month, department, or status to process pending requests efficiently.",
      },
    ],
  },
  {
    id: "ceo_portal_v1",
    portal: "ceo",
    title: "Executive portal overview",
    routeMatch: CEO_ROUTES.home,
    autoStart: true,
    steps: [
      {
        id: "welcome",
        title: "Welcome to the executive portal",
        description:
          "A focused view for approvals, organization insight, and leadership oversight.",
      },
      {
        id: "navigation",
        title: "Executive navigation",
        description:
          "Move between organization, approvals, reports, and analytics from the sidebar.",
        target: TOUR_TARGETS.sidebar,
        placement: "right",
      },
      {
        id: "dashboard",
        title: "Leadership dashboard",
        description:
          "See company signals, pending decisions, and items that need your attention.",
        target: TOUR_TARGETS.dashboardKpis,
        placement: "bottom",
      },
      {
        id: "notifications",
        title: "Executive alerts",
        description:
          "Notifications surface approvals, payroll events, and critical company updates.",
        target: TOUR_TARGETS.notifications,
        placement: "bottom",
      },
      {
        id: "account",
        title: "Help and settings",
        description:
          "Use your profile menu for Help, account security, and portal preferences.",
        target: TOUR_TARGETS.userMenu,
        placement: "bottom",
      },
      {
        id: "complete",
        title: "You're all set",
        description:
          "You now know the basics of your executive portal. Restart this tour from Help anytime.",
      },
    ],
  },
  {
    id: "ceo_approvals_v1",
    portal: "ceo",
    title: "Approvals",
    routeMatch: CEO_ROUTES.approvals,
    routePrefix: true,
    autoStart: true,
    steps: [
      {
        id: "intro",
        title: "Executive approvals",
        description:
          "Review leave, exit, and other items that need an executive decision.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "Approvals in the sidebar",
        description: "Open Approvals whenever you need to clear pending sign-offs.",
        target: navTourSelector(CEO_ROUTES.approvals),
        placement: "right",
      },
      {
        id: "complete",
        title: "Stay decisive",
        description:
          "Act on items promptly so teams can move forward without delays.",
      },
    ],
  },
  {
    id: "manager_portal_v1",
    portal: "manager",
    title: "Manager portal overview",
    routeMatch: MANAGER_ROUTES.home,
    autoStart: true,
    steps: [
      {
        id: "welcome",
        title: "Welcome to the manager portal",
        description:
          "Manage your team while keeping your own self-service tools in the same place.",
      },
      {
        id: "navigation",
        title: "Manager navigation",
        description:
          "Self-service is for you. Administration covers teammates, team attendance, and team leave.",
        target: TOUR_TARGETS.sidebar,
        placement: "right",
      },
      {
        id: "dashboard",
        title: "Your dashboard",
        description:
          "Track team signals, your attendance, and upcoming events from one screen.",
        target: TOUR_TARGETS.dashboardKpis,
        placement: "bottom",
      },
      {
        id: "notifications",
        title: "Team updates",
        description:
          "Notifications keep you informed about approvals, attendance, and HR updates.",
        target: TOUR_TARGETS.notifications,
        placement: "bottom",
      },
      {
        id: "account",
        title: "Help and account",
        description:
          "Open your profile menu for Help, settings, and sign out.",
        target: TOUR_TARGETS.userMenu,
        placement: "bottom",
      },
      {
        id: "complete",
        title: "You're all set",
        description:
          "You now know the basics of your manager portal. Restart this tour from Help anytime.",
      },
    ],
  },
  {
    id: "manager_team_v1",
    portal: "manager",
    title: "Teammates",
    routeMatch: MANAGER_ROUTES.team,
    routePrefix: true,
    autoStart: true,
    permissions: ["employee.view"],
    steps: [
      {
        id: "intro",
        title: "Your teammates",
        description:
          "View people in your reporting line, open profiles, and understand team structure.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "Teammates in the sidebar",
        description: "Return to Teammates under Administration anytime.",
        target: navTourSelector(MANAGER_ROUTES.team),
        placement: "right",
      },
      {
        id: "complete",
        title: "Team visibility",
        description:
          "Use this view before approvals, reviews, or attendance follow-ups.",
      },
    ],
  },
  {
    id: "manager_team_leave_v1",
    portal: "manager",
    title: "Team leave",
    routeMatch: MANAGER_ROUTES.leaveTeam,
    routePrefix: true,
    autoStart: true,
    permissions: ["leave.view"],
    steps: [
      {
        id: "intro",
        title: "Team leave",
        description:
          "See planned absences and requests for people in your reporting hierarchy.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "Team Leave in the sidebar",
        description:
          "Use Team Leave under Administration. Personal leave stays under Self-service.",
        target: navTourSelector(MANAGER_ROUTES.leaveTeam),
        placement: "right",
      },
      {
        id: "complete",
        title: "Plan around absences",
        description:
          "Check upcoming leave before scheduling meetings or deadlines.",
      },
    ],
  },
  {
    id: "employee_portal_v1",
    portal: "employee",
    title: "Employee portal overview",
    routeMatch: EMPLOYEE_ROUTES.home,
    autoStart: true,
    steps: [
      {
        id: "welcome",
        title: "Welcome to your employee portal",
        description:
          "Everything you need for attendance, leave, payslips, and personal HR tasks.",
      },
      {
        id: "navigation",
        title: "Self-service navigation",
        description:
          "Open Attendance, Leave, Payroll, Documents, and more from the sidebar.",
        target: TOUR_TARGETS.sidebar,
        placement: "right",
      },
      {
        id: "dashboard",
        title: "Your dashboard",
        description:
          "See today's attendance, upcoming holidays, and quick highlights at a glance.",
        target: TOUR_TARGETS.dashboardKpis,
        placement: "bottom",
      },
      {
        id: "notifications",
        title: "Notifications",
        description:
          "Get updates on approvals, payslips, and company announcements.",
        target: TOUR_TARGETS.notifications,
        placement: "bottom",
      },
      {
        id: "account",
        title: "Help and settings",
        description:
          "Your profile menu includes Help, password reset, and preferences.",
        target: TOUR_TARGETS.userMenu,
        placement: "bottom",
      },
      {
        id: "complete",
        title: "You're all set",
        description:
          "You now know the basics of your employee portal. Restart this tour from Help anytime.",
      },
    ],
  },
  {
    id: "employee_attendance_v1",
    portal: "employee",
    title: "Attendance",
    routeMatch: EMPLOYEE_ROUTES.attendance,
    routePrefix: true,
    autoStart: true,
    permissions: ["attendance.view"],
    steps: [
      {
        id: "intro",
        title: "Your attendance",
        description:
          "Check in, review history, and confirm your daily presence records.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "Attendance in the sidebar",
        description: "Open Attendance under Self-service whenever you start or end your day.",
        target: navTourSelector(EMPLOYEE_ROUTES.attendance),
        placement: "right",
      },
      {
        id: "complete",
        title: "Stay on record",
        description:
          "Regular check-ins keep payroll and compliance accurate.",
      },
    ],
  },
  {
    id: "employee_leave_v1",
    portal: "employee",
    title: "Leave",
    routeMatch: EMPLOYEE_ROUTES.leave,
    routePrefix: true,
    autoStart: true,
    permissions: ["leave.view"],
    steps: [
      {
        id: "intro",
        title: "Apply for leave",
        description:
          "View balances, apply for time off, and track approval status.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "Leave in the sidebar",
        description: "Return to Leave to submit or follow up on requests.",
        target: navTourSelector(EMPLOYEE_ROUTES.leave),
        placement: "right",
      },
      {
        id: "complete",
        title: "Plan your time off",
        description:
          "Submit requests early so approvers can plan coverage.",
      },
    ],
  },
  {
    id: "system_portal_v1",
    portal: "system",
    title: "System administration overview",
    routeMatch: SYSTEM_ADMIN_ROUTES.home,
    autoStart: true,
    permissions: ["system.admin.access"],
    steps: [
      {
        id: "welcome",
        title: "System administration",
        description:
          "Monitor platform health, security, and organization-wide controls from one place.",
      },
      {
        id: "navigation",
        title: "System navigation",
        description:
          "System Administration modules sit below your personal self-service items.",
        target: TOUR_TARGETS.sidebar,
        placement: "right",
      },
      {
        id: "switcher",
        title: "Portal switcher",
        description:
          "Switch between System Administration and the HR portal without signing out.",
        target: TOUR_TARGETS.portalSwitcher,
        placement: "bottom",
      },
      {
        id: "dashboard",
        title: "System dashboard",
        description:
          "Review health indicators, usage signals, and areas that need attention.",
        target: TOUR_TARGETS.dashboardKpis,
        placement: "bottom",
      },
      {
        id: "account",
        title: "Help and settings",
        description:
          "Use your profile menu for Help, security, and account preferences.",
        target: TOUR_TARGETS.userMenu,
        placement: "bottom",
      },
      {
        id: "complete",
        title: "You're all set",
        description:
          "You now know the basics of system administration. Restart this tour from Help anytime.",
      },
    ],
  },
  {
    id: "system_overview_v1",
    portal: "system",
    title: "System overview",
    routeMatch: SYSTEM_ADMIN_ROUTES.overview,
    routePrefix: true,
    autoStart: true,
    permissions: ["system.admin.access"],
    steps: [
      {
        id: "intro",
        title: "System overview",
        description:
          "A consolidated view of platform status, modules, and operational signals.",
        target: TOUR_TARGETS.mainContent,
        placement: "top",
      },
      {
        id: "nav",
        title: "System Dashboard",
        description:
          "Open System Dashboard under System Administration for this overview.",
        target: navTourSelector(SYSTEM_ADMIN_ROUTES.overview),
        placement: "right",
      },
      {
        id: "complete",
        title: "Operate with confidence",
        description:
          "Use this page during daily checks or before major configuration changes.",
      },
    ],
  },
];

export const PRODUCT_TOUR_MAP = new Map(PRODUCT_TOURS.map((tour) => [tour.id, tour]));
