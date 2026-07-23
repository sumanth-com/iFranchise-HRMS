import {
  Archive,
  Cloud,
  Database,
  Download,
  Flag,
  Globe,
  Key,
  LayoutDashboard,
  Mail,
  Plug,
  Server,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { NavigationItem } from "@/lib/auth/navigation";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { ROLES_ROUTES } from "@/lib/roles/constants";
import { USER_PROVISIONING_ROUTES } from "@/lib/user-provisioning/constants";

export type SystemModuleDefinition = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  external?: boolean;
};

/**
 * System Administration sidebar — infrastructure and platform controls only.
 * HR operations (organization, roles, provisioning, audit, settings) live under
 * Administration so Super Admin does not see duplicate entries.
 */
export const SYSTEM_ADMIN_NAV_ITEMS: NavigationItem[] = [
  {
    title: "System Dashboard",
    href: SYSTEM_ADMIN_ROUTES.dashboard,
    icon: LayoutDashboard,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Database Health",
    href: SYSTEM_ADMIN_ROUTES.database,
    icon: Database,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Storage Manager",
    href: SYSTEM_ADMIN_ROUTES.storage,
    icon: Archive,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Email Services",
    href: SYSTEM_ADMIN_ROUTES.email,
    icon: Mail,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "API Keys",
    href: SYSTEM_ADMIN_ROUTES.apiKeys,
    icon: Key,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Integrations",
    href: SYSTEM_ADMIN_ROUTES.integrations,
    icon: Plug,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "License & Subscription",
    href: SYSTEM_ADMIN_ROUTES.license,
    icon: Server,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Feature Flags",
    href: SYSTEM_ADMIN_ROUTES.featureFlags,
    icon: Flag,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Maintenance Mode",
    href: SYSTEM_ADMIN_ROUTES.maintenance,
    icon: Wrench,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Backup & Restore",
    href: SYSTEM_ADMIN_ROUTES.backup,
    icon: Cloud,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Import / Export",
    href: SYSTEM_ADMIN_ROUTES.importExport,
    icon: Download,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
  {
    title: "Environment",
    href: SYSTEM_ADMIN_ROUTES.environment,
    icon: Globe,
    section: "System Administration",
    roles: ["super_admin"],
    permissions: ["system.admin.access"],
  },
];

/** Deep links from system module pages to existing HR admin screens (not shown in sidebar). */
export const SYSTEM_MODULE_LINKS: Record<string, { title: string; description: string; targetHref: string }> = {
  organization: {
    title: "Organization Management",
    description: "Branches, departments, designations, holidays, and org structure.",
    targetHref: "/dashboard/organization",
  },
  roles: {
    title: "Role Management",
    description: "Create, edit, clone, and delete roles. Assign permissions and navigation.",
    targetHref: ROLES_ROUTES.manage,
  },
  permissions: {
    title: "Permission Matrix",
    description: "View and assign permissions across all roles.",
    targetHref: ROLES_ROUTES.permissions,
  },
  provisioning: {
    title: "User Provisioning",
    description: "Invite executives, HR, and managers with portal assignment.",
    targetHref: USER_PROVISIONING_ROUTES.hr,
  },
  iam: {
    title: "Identity & Access Management",
    description: "User role assignments, portal routing, and access reviews.",
    targetHref: ROLES_ROUTES.assignments,
  },
  configuration: {
    title: "System Configuration",
    description: "Company settings, payroll, and global HRMS configuration.",
    targetHref: "/dashboard/company-settings",
  },
  audit: {
    title: "Audit Center",
    description: "Full audit trail for logins, role changes, and security events.",
    targetHref: "/dashboard/audit",
  },
  logs: {
    title: "System Logs",
    description: "Application and security audit logs with filters.",
    targetHref: "/dashboard/audit/logs",
  },
  security: {
    title: "Security Center",
    description: "Failed logins, suspensions, and high-priority security alerts.",
    targetHref: "/dashboard/audit/timeline",
  },
  notifications: {
    title: "Notification Services",
    description: "Notification templates, delivery history, and preferences.",
    targetHref: "/dashboard/notifications",
  },
  branding: {
    title: "Branding",
    description: "Logo, colors, and organization branding for emails and payslips.",
    targetHref: "/dashboard/company-settings?section=branding",
  },
  smtp: {
    title: "SMTP Settings",
    description: "Email delivery configuration for invitations and notifications.",
    targetHref: "/dashboard/notifications/settings",
  },
};
