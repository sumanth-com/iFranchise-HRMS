import {
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  LaptopMinimal,
  LayoutDashboard,
  Plug,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Target,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export type SystemModuleDefinition = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
};

/**
 * Super Admin portal sidebar.
 * Self-service (personal workspace) is listed first.
 * System Administration follows — operational HR still primarily owned by HR.
 */
export const SYSTEM_ADMIN_NAV_ITEMS: NavigationItem[] = [
  {
    title: "Dashboard",
    href: SYSTEM_ADMIN_ROUTES.home,
    icon: LayoutDashboard,
    section: "Self-service",
    roles: ["super_admin"],
  },
  {
    title: "My Profile",
    href: SYSTEM_ADMIN_ROUTES.profile,
    icon: UserRound,
    section: "Self-service",
    roles: ["super_admin"],
    permissions: ["employee_profile.view"],
  },
  {
    title: "Attendance",
    href: SYSTEM_ADMIN_ROUTES.attendance,
    icon: CalendarCheck,
    section: "Self-service",
    roles: ["super_admin"],
    permissions: ["attendance.view"],
  },
  {
    title: "Payroll",
    href: SYSTEM_ADMIN_ROUTES.payroll,
    icon: Wallet,
    section: "Self-service",
    roles: ["super_admin"],
    permissions: ["payroll.view", "payslip.view"],
  },
  {
    title: "Documents",
    href: SYSTEM_ADMIN_ROUTES.documents,
    icon: FileText,
    section: "Self-service",
    roles: ["super_admin"],
    permissions: ["documents.view"],
  },
  {
    title: "Leave",
    href: SYSTEM_ADMIN_ROUTES.leave,
    icon: CalendarDays,
    section: "Self-service",
    roles: ["super_admin"],
    permissions: ["leave.view"],
  },
  {
    title: "My Goals",
    href: SYSTEM_ADMIN_ROUTES.goals,
    icon: Target,
    section: "Self-service",
    roles: ["super_admin"],
    permissions: ["performance.view"],
  },
  {
    title: "Assets",
    href: SYSTEM_ADMIN_ROUTES.assets,
    icon: LaptopMinimal,
    section: "Self-service",
    roles: ["super_admin"],
    permissions: ["asset.view"],
  },
  {
    title: "Notifications",
    href: SYSTEM_ADMIN_ROUTES.notificationsCenter,
    icon: Bell,
    section: "Self-service",
    roles: ["super_admin"],
    permissions: ["notifications.view", "notification.view"],
  },
  {
    title: "Settings",
    href: SYSTEM_ADMIN_ROUTES.settings,
    icon: Settings,
    section: "Self-service",
    roles: ["super_admin"],
  },
  {
    title: "System Dashboard",
    href: SYSTEM_ADMIN_ROUTES.overview,
    icon: LayoutDashboard,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "HR Overview",
    href: SYSTEM_ADMIN_ROUTES.hrOverview,
    icon: ClipboardList,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access", "employee.view"],
  },
  {
    title: "Employees",
    href: SYSTEM_ADMIN_ROUTES.employees,
    icon: Users,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access", "employee.view"],
  },
  {
    title: "User Provisioning",
    href: SYSTEM_ADMIN_ROUTES.provisioning,
    icon: UserPlus,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access", "user_provisioning.view", "user_provisioning.manage"],
  },
  {
    title: "Roles & Access",
    href: SYSTEM_ADMIN_ROUTES.roles,
    icon: ShieldCheck,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access", "role.view"],
  },
  {
    title: "Organization",
    href: SYSTEM_ADMIN_ROUTES.organization,
    icon: Building2,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access", "organization.view", "branch.view", "department.view"],
  },
  {
    title: "Audit Trail",
    href: `${SYSTEM_ADMIN_ROUTES.audit}/logs`,
    icon: ScrollText,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access", "audit.view"],
  },
  {
    title: "Security",
    href: SYSTEM_ADMIN_ROUTES.security,
    icon: Shield,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access", "audit.view"],
  },
  {
    title: "System / Integrations",
    href: SYSTEM_ADMIN_ROUTES.integrations,
    icon: Plug,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
];

/** Deep links from system module pages to existing Super Admin screens (not shown in sidebar). */
export const SYSTEM_MODULE_LINKS: Record<string, { title: string; description: string; targetHref: string }> = {
  organization: {
    title: "Organization Management",
    description: "Branches, departments, designations, and reporting structure.",
    targetHref: SYSTEM_ADMIN_ROUTES.organization,
  },
  roles: {
    title: "Roles & Access",
    description: "Manage roles, permissions, and user assignments.",
    targetHref: SYSTEM_ADMIN_ROUTES.roles,
  },
  permissions: {
    title: "Permission Matrix",
    description: "Grant and revoke permissions by role.",
    targetHref: `${SYSTEM_ADMIN_ROUTES.roles}/permissions`,
  },
  provisioning: {
    title: "User Provisioning",
    description: "Invite users, assign portals/roles, and manage identity lifecycle.",
    targetHref: SYSTEM_ADMIN_ROUTES.provisioning,
  },
  iam: {
    title: "Identity & Access Management",
    description: "User role assignments, portal routing, and access reviews.",
    targetHref: `${SYSTEM_ADMIN_ROUTES.roles}/assignments`,
  },
  configuration: {
    title: "System Configuration",
    description: "Company settings, payroll, and global HRMS configuration.",
    targetHref: SYSTEM_ADMIN_ROUTES.organization,
  },
  audit: {
    title: "Audit Center",
    description: "Full audit trail for logins, role changes, and security events.",
    targetHref: `${SYSTEM_ADMIN_ROUTES.audit}/logs`,
  },
  logs: {
    title: "System Logs",
    description: "Application and security audit logs with filters.",
    targetHref: `${SYSTEM_ADMIN_ROUTES.audit}/logs`,
  },
  security: {
    title: "Security Center",
    description: "Failed logins, suspensions, and high-priority security alerts.",
    targetHref: SYSTEM_ADMIN_ROUTES.security,
  },
  branding: {
    title: "Branding",
    description: "Logo, colors, and organization branding for emails and payslips.",
    targetHref: `${SYSTEM_ADMIN_ROUTES.organization}/profile`,
  },
  smtp: {
    title: "SMTP Settings",
    description: "Email delivery configuration for invitations and notifications.",
    targetHref: SYSTEM_ADMIN_ROUTES.integrations,
  },
};
