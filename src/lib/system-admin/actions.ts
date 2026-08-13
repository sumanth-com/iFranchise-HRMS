"use server";

import { revalidatePath } from "next/cache";

import { hasEmailTransport } from "@/lib/email/mailer";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { getSystemDashboardStats } from "@/lib/system-admin/queries";
import {
  createSystemApiKey,
  deleteSystemApiKey,
  listSystemApiKeys,
  revokeSystemApiKey,
  rotateSystemApiKey,
} from "@/lib/system-admin/services/api-keys-service";
import { writeSystemAudit } from "@/lib/system-admin/services/audit-helper";
import {
  getBackupDownloadPayload,
  listBackupJobs,
  runBackupJob,
  type BackupType,
} from "@/lib/system-admin/services/backup-service";
import { getDatabaseHealthDetail } from "@/lib/system-admin/services/database-health-service";
import {
  getEmailServiceSnapshot,
  retryFailedEmails,
  sendTestEmail,
} from "@/lib/system-admin/services/email-service";
import { getEnvironmentSnapshot } from "@/lib/system-admin/services/environment-service";
import {
  exportModuleData,
  importEmployeesCsv,
  listImportJobs,
  restoreFromBackupJson,
  type ExportModule,
} from "@/lib/system-admin/services/import-export-service";
import {
  integrationProviderLabel,
  listSystemIntegrations,
  setIntegrationStatus,
  syncIntegration,
  type IntegrationProvider,
} from "@/lib/system-admin/services/integrations-service";
import {
  createStorageSignedUrl,
  deleteStorageObject,
  listStorageBuckets,
  listStorageObjects,
} from "@/lib/system-admin/services/storage-service";
import {
  getLicenseSnapshot,
  getSystemSettings,
  updateSystemSettings,
} from "@/lib/system-admin/services/system-settings";
import { createClient } from "@/lib/supabase/server";

function revalidateSystemAdmin() {
  for (const route of Object.values(SYSTEM_ADMIN_ROUTES)) {
    revalidatePath(route);
  }
}

export async function refreshSystemDashboardAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await getSystemDashboardStats(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to refresh dashboard",
    };
  }
}

export async function fetchSystemSettingsAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const settings = await getSystemSettings(supabase, profile.employee.organizationId);
    return { success: true as const, data: settings };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load settings",
    };
  }
}

export async function updateMaintenanceModeAction(enabled: boolean, message?: string | null) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
      maintenanceMode: enabled,
      maintenanceMessage: message ?? null,
    });
    await writeSystemAudit(supabase, profile, {
      action: "maintenance_mode",
      description: enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
      priority: "high",
      metadata: { enabled, message },
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update maintenance mode",
    };
  }
}

export async function updateMaintenanceScheduleAction(input: {
  scheduledAt: string | null;
  banner: string | null;
  allowedUsers: string[];
  emergencyShutdown: boolean;
}) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
      maintenanceScheduledAt: input.scheduledAt,
      maintenanceBanner: input.banner,
      maintenanceAllowedUsers: input.allowedUsers,
      emergencyShutdown: input.emergencyShutdown,
    });
    await writeSystemAudit(supabase, profile, {
      action: "maintenance_schedule",
      description: "Maintenance schedule updated",
      priority: "high",
      metadata: input,
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update maintenance schedule",
    };
  }
}

export async function updateFeatureFlagsAction(flags: Record<string, boolean>) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const current = await getSystemSettings(supabase, profile.employee.organizationId);
    await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
      featureFlags: { ...current.featureFlags, ...flags },
    });
    await writeSystemAudit(supabase, profile, {
      action: "feature_flags",
      description: "Feature flags updated",
      metadata: flags,
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update feature flags",
    };
  }
}

export async function updateFeatureRolloutAction(
  flagKey: string,
  rollout: { percentage: number; environment: string },
) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const current = await getSystemSettings(supabase, profile.employee.organizationId);
    await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
      featureFlagRollouts: { ...current.featureFlagRollouts, [flagKey]: rollout },
    });
    await writeSystemAudit(supabase, profile, {
      action: "feature_rollout",
      description: `Rollout updated for ${flagKey}`,
      metadata: rollout,
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update rollout",
    };
  }
}

export async function updateEnvironmentLabelAction(label: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
      environmentLabel: label.trim(),
    });
    await writeSystemAudit(supabase, profile, {
      action: "environment_label",
      description: `Environment label set to ${label.trim()}`,
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update environment",
    };
  }
}

export async function createApiKeyAction(input: {
  name: string;
  permissions: string[];
  allowedIps: string[];
  expiresAt: string | null;
}) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const result = await createSystemApiKey(supabase, profile, input);
    await writeSystemAudit(supabase, profile, {
      action: "api_key_created",
      description: `API key created: ${input.name}`,
      recordId: result.id,
      priority: "high",
    });
    revalidateSystemAdmin();
    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to create API key",
    };
  }
}

export async function revokeApiKeyAction(keyId: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await revokeSystemApiKey(supabase, profile.employee.organizationId, keyId);
    await writeSystemAudit(supabase, profile, {
      action: "api_key_revoked",
      description: "API key revoked",
      recordId: keyId,
      priority: "high",
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to revoke API key",
    };
  }
}

export async function deleteApiKeyAction(keyId: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await deleteSystemApiKey(supabase, profile.employee.organizationId, keyId);
    await writeSystemAudit(supabase, profile, {
      action: "api_key_deleted",
      description: "API key deleted",
      recordId: keyId,
      priority: "high",
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to delete API key",
    };
  }
}

export async function rotateApiKeyAction(keyId: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await rotateSystemApiKey(supabase, profile, keyId);
    await writeSystemAudit(supabase, profile, {
      action: "api_key_rotated",
      description: "API key rotated",
      recordId: keyId,
      priority: "high",
    });
    revalidateSystemAdmin();
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to rotate API key",
    };
  }
}

export async function listApiKeysAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await listSystemApiKeys(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load API keys",
    };
  }
}

export async function runBackupAction(backupType: BackupType, format: "json" | "csv") {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await runBackupJob(supabase, profile, backupType, format);
    await writeSystemAudit(supabase, profile, {
      action: "backup_created",
      description: `Backup completed: ${backupType} (${format})`,
      recordId: data.id,
      priority: "high",
      metadata: { backupType, format, recordCount: data.recordCount },
    });
    revalidateSystemAdmin();
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Backup failed",
    };
  }
}

export async function downloadBackupAction(jobId: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await getBackupDownloadPayload(
      supabase,
      profile.employee.organizationId,
      jobId,
    );
    if (!data) return { success: false as const, message: "Backup file not found" };
    await writeSystemAudit(supabase, profile, {
      action: "backup_downloaded",
      description: "Backup downloaded",
      recordId: jobId,
    });
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Download failed",
    };
  }
}

export async function listBackupsAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await listBackupJobs(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load backups",
    };
  }
}

export async function restoreBackupAction(jobId: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await restoreFromBackupJson(supabase, profile, jobId);
    await writeSystemAudit(supabase, profile, {
      action: "backup_restored",
      description: `Restore completed from backup ${jobId}`,
      recordId: jobId,
      priority: "critical",
      metadata: data,
    });
    revalidateSystemAdmin();
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Restore failed",
    };
  }
}

export async function exportModuleAction(module: ExportModule, format: "json" | "csv") {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await exportModuleData(
      supabase,
      profile.employee.organizationId,
      module,
      format,
    );
    await writeSystemAudit(supabase, profile, {
      action: "data_exported",
      description: `Exported ${module} as ${format}`,
      metadata: { module, format },
    });
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Export failed",
    };
  }
}

export async function importEmployeesAction(csvContent: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await importEmployeesCsv(supabase, profile, csvContent);
    await writeSystemAudit(supabase, profile, {
      action: "data_imported",
      description: `Employee import: ${data.successCount} succeeded, ${data.errorCount} errors`,
      recordId: data.id,
      priority: "high",
      metadata: data,
    });
    revalidateSystemAdmin();
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Import failed",
    };
  }
}

export async function listImportJobsAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await listImportJobs(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load import history",
    };
  }
}

export async function sendTestEmailAction(toEmail: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const result = await sendTestEmail(supabase, profile, toEmail);
    await writeSystemAudit(supabase, profile, {
      action: "test_email",
      description: result.success ? "Test email sent" : `Test email failed: ${result.message}`,
      eventStatus: result.success ? "success" : "failed",
      priority: "medium",
    });
    if (hasEmailTransport() && result.success) {
      await updateSystemSettings(supabase, profile, profile.employee.organizationId, {
        smtpConfigured: true,
      });
    }
    revalidateSystemAdmin();
    return { success: result.success as boolean, message: result.message };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Test email failed",
    };
  }
}

export async function retryFailedEmailsAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const count = await retryFailedEmails(supabase, profile.employee.organizationId);
    await writeSystemAudit(supabase, profile, {
      action: "email_retry",
      description: `Retried ${count} failed emails`,
    });
    revalidateSystemAdmin();
    return { success: true as const, data: count };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Retry failed",
    };
  }
}

export async function getEmailSnapshotAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await getEmailServiceSnapshot(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load email status",
    };
  }
}

export async function listIntegrationsAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await listSystemIntegrations(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load integrations",
    };
  }
}

export async function toggleIntegrationAction(
  provider: IntegrationProvider,
  connect: boolean,
) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await setIntegrationStatus(
      supabase,
      profile.employee.organizationId,
      provider,
      connect ? "connected" : "disconnected",
    );
    await writeSystemAudit(supabase, profile, {
      action: connect ? "integration_connected" : "integration_disconnected",
      description: `${integrationProviderLabel(provider)} ${connect ? "connected" : "disconnected"}`,
      priority: "medium",
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Integration update failed",
    };
  }
}

export async function syncIntegrationAction(provider: IntegrationProvider) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await syncIntegration(supabase, profile.employee.organizationId, provider);
    await writeSystemAudit(supabase, profile, {
      action: "integration_sync",
      description: `Manual sync for ${integrationProviderLabel(provider)}`,
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

export async function listStorageBucketsAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const data = await listStorageBuckets(profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load buckets",
    };
  }
}

export async function listStorageObjectsAction(bucket: string, prefix?: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const data = await listStorageObjects(
      profile.employee.organizationId,
      bucket,
      prefix ?? "",
    );
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to list objects",
    };
  }
}

export async function deleteStorageObjectAction(bucket: string, objectPath: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    await deleteStorageObject(profile.employee.organizationId, bucket, objectPath);
    await writeSystemAudit(supabase, profile, {
      action: "storage_deleted",
      description: `Deleted ${bucket}/${objectPath}`,
      priority: "high",
    });
    revalidateSystemAdmin();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

export async function signStorageObjectAction(bucket: string, objectPath: string) {
  try {
    const profile = await requireSuperAdminProfile();
    const url = await createStorageSignedUrl(
      profile.employee.organizationId,
      bucket,
      objectPath,
    );
    return { success: true as const, data: url };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to sign URL",
    };
  }
}

export async function getDatabaseHealthAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await getDatabaseHealthDetail(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Health check failed",
    };
  }
}

export async function getLicenseSnapshotAction() {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const data = await getLicenseSnapshot(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load license",
    };
  }
}

export async function getEnvironmentSnapshotAction() {
  try {
    await requireSuperAdminProfile();
    const smtpConfigured = hasEmailTransport();
    const data = getEnvironmentSnapshot(smtpConfigured, true);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load environment",
    };
  }
}
