import { notFound } from "next/navigation";

import { SystemModuleView } from "@/components/system-admin/system-module-view";
import { SYSTEM_MODULE_LINKS } from "@/config/system-admin-navigation";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { getDatabaseHealthSnapshot } from "@/lib/system-admin/queries";
import { getSystemSettings } from "@/lib/system-admin/services/system-settings";
import { createClient } from "@/lib/supabase/server";

const MODULE_META: Record<string, { title: string; description: string }> = {
  organization: {
    title: "Organization Management",
    description: "Branches, departments, designations, holidays, and org structure.",
  },
  roles: {
    title: "Role Management",
    description: "Create, edit, clone, and delete roles. Assign permissions and navigation.",
  },
  permissions: {
    title: "Permission Matrix",
    description: "View and assign permissions across all roles.",
  },
  provisioning: {
    title: "User Provisioning",
    description: "Invite executives, HR, and managers with portal assignment.",
  },
  iam: {
    title: "Identity & Access Management",
    description: "User role assignments, portal routing, and access reviews.",
  },
  configuration: {
    title: "System Configuration",
    description: "Company settings, payroll, and global HRMS configuration.",
  },
  database: {
    title: "Database Health",
    description: "Row counts and connectivity for core HRMS tables.",
  },
  storage: {
    title: "Storage Manager",
    description: "Document and profile image storage buckets.",
  },
  email: {
    title: "Email Services",
    description: "Transactional email delivery and templates.",
  },
  notifications: {
    title: "Notification Services",
    description: "In-app notifications, templates, and delivery history.",
  },
  "api-keys": {
    title: "API Keys",
    description: "Service credentials and integration tokens.",
  },
  audit: {
    title: "Audit Center",
    description: "Full audit trail for logins, role changes, and security events.",
  },
  logs: {
    title: "System Logs",
    description: "Application and security audit logs with filters.",
  },
  security: {
    title: "Security Center",
    description: "Failed logins, suspensions, and high-priority security alerts.",
  },
  integrations: {
    title: "Integrations",
    description: "Third-party connectors and webhooks.",
  },
  license: {
    title: "License & Subscription",
    description: "Plan details and subscription status.",
  },
  "feature-flags": {
    title: "Feature Flags",
    description: "Toggle experimental and rollout features.",
  },
  maintenance: {
    title: "Maintenance Mode",
    description: "Enable maintenance mode and customize the banner message.",
  },
  backup: {
    title: "Backup & Restore",
    description: "Database backups and disaster recovery.",
  },
  "import-export": {
    title: "Import / Export",
    description: "Bulk data import and export utilities.",
  },
  environment: {
    title: "Environment Settings",
    description: "Environment label and deployment configuration.",
  },
  branding: {
    title: "Branding",
    description: "Logo, colors, and organization branding.",
  },
  smtp: {
    title: "SMTP Settings",
    description: "Email delivery configuration for invitations and notifications.",
  },
};

type SystemModulePageProps = {
  params: Promise<{ module: string }>;
};

export default async function SystemModulePage({ params }: SystemModulePageProps) {
  const { module } = await params;
  const meta = MODULE_META[module];
  if (!meta) notFound();

  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;

  const link = SYSTEM_MODULE_LINKS[module];
  const settings =
    module === "maintenance" || module === "feature-flags" || module === "environment" || module === "license"
      ? await getSystemSettings(supabase, orgId)
      : undefined;
  const databaseHealth = module === "database" ? await getDatabaseHealthSnapshot(supabase) : undefined;

  return (
    <div className="space-y-6">
      <SystemModuleView
        module={module}
        title={meta.title}
        description={meta.description}
        targetHref={link?.targetHref}
        settings={settings}
        databaseHealth={databaseHealth}
      />
    </div>
  );
}
