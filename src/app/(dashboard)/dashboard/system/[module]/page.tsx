import { notFound } from "next/navigation";

import { SystemModuleView } from "@/components/system-admin/system-module-view";
import {
  ApiKeysPanel,
  BackupPanel,
  DatabaseHealthPanel,
  EmailServicesPanel,
  EnvironmentPanel,
  FeatureFlagsPanel,
  ImportExportPanel,
  IntegrationsPanel,
  LicensePanel,
  MaintenancePanel,
  StorageManagerPanel,
} from "@/components/system-admin/system-admin-modules";
import { SYSTEM_MODULE_LINKS } from "@/config/system-admin-navigation";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { listSystemApiKeys } from "@/lib/system-admin/services/api-keys-service";
import { listBackupJobs } from "@/lib/system-admin/services/backup-service";
import { getDatabaseHealthDetail } from "@/lib/system-admin/services/database-health-service";
import { getEmailServiceSnapshot } from "@/lib/system-admin/services/email-service";
import { getEnvironmentSnapshot } from "@/lib/system-admin/services/environment-service";
import { listImportJobs } from "@/lib/system-admin/services/import-export-service";
import { listSystemIntegrations } from "@/lib/system-admin/services/integrations-service";
import {
  getLicenseSnapshot,
  getSystemSettings,
} from "@/lib/system-admin/services/system-settings";
import { listStorageBuckets } from "@/lib/system-admin/services/storage-service";
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
    description: "Connection, table counts, issues, and remediation.",
  },
  storage: {
    title: "Storage Manager",
    description: "Buckets, files, signed URLs, and cleanup.",
  },
  email: {
    title: "Email Services",
    description: "SMTP status, test delivery, queue, and logs.",
  },
  notifications: {
    title: "Notification Services",
    description: "In-app notifications, templates, and delivery history.",
  },
  "api-keys": {
    title: "API Keys",
    description: "Generate, rotate, and revoke API credentials.",
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
    description: "Microsoft 365, Google, Slack, Teams, Zoom, webhooks.",
  },
  license: {
    title: "License & Subscription",
    description: "Plan, seats, limits, and subscription status.",
  },
  "feature-flags": {
    title: "Feature Flags",
    description: "Rollout percentages, beta features, kill switch.",
  },
  maintenance: {
    title: "Maintenance Mode",
    description: "Scheduled maintenance, banners, and emergency shutdown.",
  },
  backup: {
    title: "Backup & Restore",
    description: "Export, download, and restore organization data.",
  },
  "import-export": {
    title: "Import / Export",
    description: "Bulk CSV/JSON import and export with validation.",
  },
  environment: {
    title: "Environment Settings",
    description: "Deployment version, runtime, and infrastructure status.",
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
  if (link?.targetHref) {
    return (
      <SystemModuleView
        module={module}
        title={meta.title}
        description={meta.description}
        targetHref={link.targetHref}
      />
    );
  }

  if (module === "database") {
    const data = await getDatabaseHealthDetail(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <DatabaseHealthPanel initial={data} />
      </div>
    );
  }

  if (module === "storage") {
    const buckets = await listStorageBuckets(orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <StorageManagerPanel buckets={buckets} organizationId={orgId} />
      </div>
    );
  }

  if (module === "email") {
    const snapshot = await getEmailServiceSnapshot(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <EmailServicesPanel snapshot={snapshot} />
      </div>
    );
  }

  if (module === "api-keys") {
    const keys = await listSystemApiKeys(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <ApiKeysPanel keys={keys} />
      </div>
    );
  }

  if (module === "integrations") {
    const integrations = await listSystemIntegrations(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <IntegrationsPanel integrations={integrations} />
      </div>
    );
  }

  if (module === "license") {
    const license = await getLicenseSnapshot(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <LicensePanel
          licensePlan={license.settings.licensePlan}
          licenseExpiresAt={license.settings.licenseExpiresAt}
          licenseKey={license.settings.licenseKey}
          activeUsers={license.activeUsers}
          remainingSeats={license.remainingSeats}
          employeeLimit={license.settings.licenseEmployeeLimit}
          storageLimitGb={license.settings.licenseStorageLimitGb}
          apiUsage={license.settings.apiUsageCount}
        />
      </div>
    );
  }

  if (module === "feature-flags") {
    const settings = await getSystemSettings(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <FeatureFlagsPanel settings={settings} />
      </div>
    );
  }

  if (module === "maintenance") {
    const settings = await getSystemSettings(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <MaintenancePanel settings={settings} />
      </div>
    );
  }

  if (module === "backup") {
    const jobs = await listBackupJobs(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <BackupPanel jobs={jobs} />
      </div>
    );
  }

  if (module === "import-export") {
    const jobs = await listImportJobs(supabase, orgId);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <ImportExportPanel jobs={jobs} />
      </div>
    );
  }

  if (module === "environment") {
    const settings = await getSystemSettings(supabase, orgId);
    const env = getEnvironmentSnapshot(settings.smtpConfigured, true);
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <EnvironmentPanel env={env} settings={settings} />
      </div>
    );
  }

  return (
    <SystemModuleView
      module={module}
      title={meta.title}
      description={meta.description}
    />
  );
}
