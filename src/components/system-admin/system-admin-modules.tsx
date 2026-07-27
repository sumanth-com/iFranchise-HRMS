"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  downloadBase64,
  SystemMetric,
  SystemModuleFrame,
  SystemPanel,
} from "@/components/system-admin/system-module-frame";
import type { SystemDashboardStats } from "@/lib/system-admin/queries";
import {
  downloadBackupAction,
  exportModuleAction,
  getDatabaseHealthAction,
  getEmailSnapshotAction,
  getEnvironmentSnapshotAction,
  getLicenseSnapshotAction,
  listBackupsAction,
  listImportJobsAction,
  listIntegrationsAction,
  listStorageBucketsAction,
  listStorageObjectsAction,
  refreshSystemDashboardAction,
  restoreBackupAction,
  retryFailedEmailsAction,
  runBackupAction,
  sendTestEmailAction,
  signStorageObjectAction,
  syncIntegrationAction,
  toggleIntegrationAction,
  updateEnvironmentLabelAction,
  updateFeatureFlagsAction,
  updateFeatureRolloutAction,
  updateMaintenanceModeAction,
  updateMaintenanceScheduleAction,
  importEmployeesAction,
} from "@/lib/system-admin/actions";
import type { SystemSettings } from "@/lib/system-admin/services/system-settings";
import type { DatabaseHealthSnapshot } from "@/lib/system-admin/services/database-health-service";
import type { EmailServiceSnapshot } from "@/lib/system-admin/services/email-service";
import type { EnvironmentSnapshot } from "@/lib/system-admin/services/environment-service";
import type { SystemIntegrationRow } from "@/lib/system-admin/services/integrations-service";
import type { BackupJobRow } from "@/lib/system-admin/services/backup-service";
import type { ImportJobRow } from "@/lib/system-admin/services/import-export-service";
import type { StorageBucketSnapshot } from "@/lib/system-admin/services/storage-service";
import { cn } from "@/lib/utils";

const DEFAULT_FLAGS = [
  "beta_portal",
  "new_payroll_ui",
  "ai_insights",
  "mobile_attendance",
  "emergency_kill_switch",
];

export function SystemDashboardLive({ initialStats }: { initialStats: SystemDashboardStats }) {
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const res = await refreshSystemDashboardAction();
      if (res.success) setStats(res.data);
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const healthColor =
    stats.systemHealth === "healthy"
      ? "text-emerald-600"
      : stats.systemHealth === "degraded"
        ? "text-amber-600"
        : "text-red-600";

  return (
    <SystemModuleFrame title="System Dashboard" description="Live operational monitoring">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between">
          <p className={cn("text-sm font-medium", healthColor)}>
            Overall health: {stats.systemHealth.toUpperCase()}
          </p>
          <Button size="sm" variant="outline" disabled={isPending} onClick={refresh}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </div>
        <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <SystemMetric label="Active Users" value={stats.activeEmployees} />
          <SystemMetric label="Sessions" value={stats.activeSessionsEstimate} />
          <SystemMetric label="Logins Today" value={stats.loginsToday} />
          <SystemMetric
            label="Failed Logins"
            value={stats.failedLogins24h}
            variant={stats.failedLogins24h > 0 ? "warning" : "default"}
          />
          <SystemMetric
            label="DB Response"
            value={`${stats.databaseResponseMs}ms`}
            variant={stats.databaseHealthy ? "success" : "danger"}
          />
          <SystemMetric label="Security Alerts" value={stats.securityAlerts24h} variant={stats.securityAlerts24h > 0 ? "warning" : "default"} />
          <SystemMetric label="Audit (24h)" value={stats.auditEvents24h} />
          <SystemMetric label="Storage Buckets" value={stats.storageBucketCount} />
          <SystemMetric label="Email" value={stats.emailStatus} variant={stats.smtpConfigured ? "success" : "warning"} />
          <SystemMetric label="API" value={stats.apiStatus} variant="success" />
          <SystemMetric label="Backup" value={stats.backupStatus} />
          <SystemMetric label="Maintenance" value={stats.maintenanceMode ? "ON" : "OFF"} variant={stats.maintenanceMode ? "warning" : "default"} />
        </div>
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-3">
          <SystemPanel title="Scheduled Jobs" className="min-h-0 overflow-hidden">
            <ul className="max-h-[140px] space-y-1 overflow-y-auto text-xs">
              {stats.scheduledJobs.map((job) => (
                <li key={job.jobKey} className="flex justify-between gap-2">
                  <span>{job.jobName}</span>
                  <span className="text-muted-foreground">{job.lastStatus ?? "idle"}</span>
                </li>
              ))}
            </ul>
          </SystemPanel>
          <SystemPanel title="Recent Audit" className="min-h-0 overflow-hidden">
            <ul className="max-h-[140px] space-y-1 overflow-y-auto text-xs">
              {stats.recentAuditEvents.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.action}</span> — {e.description}
                </li>
              ))}
            </ul>
          </SystemPanel>
          <SystemPanel title="Recent Errors" className="min-h-0 overflow-hidden">
            <ul className="max-h-[140px] space-y-1 overflow-y-auto text-xs">
              {stats.recentErrors.length === 0 ? (
                <li className="text-muted-foreground">No errors in 24h</li>
              ) : (
                stats.recentErrors.map((e) => (
                  <li key={e.id}>{e.description}</li>
                ))
              )}
            </ul>
          </SystemPanel>
        </div>
      </div>
    </SystemModuleFrame>
  );
}

export function DatabaseHealthPanel({ initial }: { initial: DatabaseHealthSnapshot }) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const refresh = () =>
    startTransition(async () => {
      const res = await getDatabaseHealthAction();
      if (res.success) setData(res.data);
      else toast.error(res.message);
    });

  return (
    <SystemModuleFrame title="Database Health" description="Connection, tables, and remediation">
      <div className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-cols-3">
        <div className="space-y-2">
          <SystemMetric label="Status" value={data.connected ? "Connected" : "Down"} variant={data.connected ? "success" : "danger"} />
          <SystemMetric label="Response" value={`${data.responseTimeMs}ms`} />
          <SystemMetric label="Total Records" value={data.totalRecords.toLocaleString()} />
          <Button size="sm" variant="outline" disabled={isPending} onClick={refresh}>Recheck</Button>
        </div>
        <SystemPanel title="Tables" className="min-h-0 lg:col-span-1">
          <ul className="max-h-[200px] space-y-1 overflow-y-auto text-xs">
            {data.tables.map((t) => (
              <li key={t.table} className="flex justify-between">
                <span>{t.table}</span>
                <span>{t.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </SystemPanel>
        <SystemPanel title="Issues & Fixes" className="min-h-0 lg:col-span-1">
          <ul className="max-h-[200px] space-y-2 overflow-y-auto text-xs">
            {data.issues.length === 0 ? (
              <li className="text-emerald-600">No issues detected</li>
            ) : (
              data.issues.map((issue, i) => (
                <li key={i} className="rounded border p-2">
                  <p className="font-semibold uppercase text-amber-600">{issue.severity}</p>
                  <p className="mt-1">{issue.cause}</p>
                  <p className="mt-1 text-muted-foreground">{issue.suggestedFix}</p>
                </li>
              ))
            )}
          </ul>
        </SystemPanel>
      </div>
    </SystemModuleFrame>
  );
}

export function StorageManagerPanel({
  buckets: initialBuckets,
}: {
  buckets: StorageBucketSnapshot[];
  organizationId: string;
}) {
  const [buckets] = useState(initialBuckets);
  const [selectedBucket, setSelectedBucket] = useState(initialBuckets[0]?.id ?? "");
  const [prefix, setPrefix] = useState("");
  const [pathLabels, setPathLabels] = useState<Record<string, string>>({});
  const [objects, setObjects] = useState<
    Array<{
      path: string;
      relativePath: string;
      displayName: string;
      isFolder: boolean;
      sizeBytes: number | null;
    }>
  >([]);
  const [isPending, startTransition] = useTransition();

  const loadObjects = (bucket: string, folderPrefix = prefix) =>
    startTransition(async () => {
      const res = await listStorageObjectsAction(bucket, folderPrefix);
      if (res.success) setObjects(res.data);
      else toast.error(res.message);
    });

  useEffect(() => {
    if (selectedBucket) {
      setPrefix("");
      setPathLabels({});
      loadObjects(selectedBucket, "");
    }
  }, [selectedBucket]);

  const breadcrumbParts = prefix ? prefix.split("/").filter(Boolean) : [];

  return (
    <SystemModuleFrame title="Storage Manager" description="Browse organization files by folder">
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-3">
        <SystemPanel title="Buckets">
          <ul className="space-y-1 text-xs">
            {buckets.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded px-2 py-1 text-left hover:bg-muted",
                    selectedBucket === b.id && "bg-muted",
                  )}
                  onClick={() => setSelectedBucket(b.id)}
                >
                  {b.name} ({b.fileCount})
                </button>
              </li>
            ))}
          </ul>
        </SystemPanel>
        <SystemPanel title="Files" className="min-h-0 lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => {
                setPrefix("");
                loadObjects(selectedBucket, "");
              }}
            >
              Organization
            </button>
            {breadcrumbParts.map((part, index) => {
              const pathTo = breadcrumbParts.slice(0, index + 1).join("/");
              return (
                <span key={pathTo} className="flex items-center gap-1">
                  <span>/</span>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => {
                      setPrefix(pathTo);
                      loadObjects(selectedBucket, pathTo);
                    }}
                  >
                    {objects.find((o) => o.relativePath === pathTo)?.displayName ??
                      pathLabels[pathTo] ??
                      "Folder"}
                  </button>
                </span>
              );
            })}
          </div>
          <ul className="max-h-[220px] space-y-1 overflow-y-auto text-xs">
            {objects.length === 0 ? (
              <li className="text-muted-foreground">No items in this folder</li>
            ) : (
              objects.map((o) => (
                <li key={o.path} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.displayName}</p>
                    {!o.isFolder && o.sizeBytes ? (
                      <p className="text-[10px] text-muted-foreground">
                        {(o.sizeBytes / 1024).toFixed(1)} KB
                      </p>
                    ) : null}
                  </div>
                  {o.isFolder ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => {
                        setPathLabels((prev) => ({
                          ...prev,
                          [o.relativePath]: o.displayName,
                        }));
                        setPrefix(o.relativePath);
                        loadObjects(selectedBucket, o.relativePath);
                      }}
                    >
                      Open folder
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await signStorageObjectAction(selectedBucket, o.path);
                          if (res.success) window.open(res.data, "_blank");
                          else toast.error(res.message);
                        })
                      }
                    >
                      Open
                    </Button>
                  )}
                </li>
              ))
            )}
          </ul>
        </SystemPanel>
      </div>
    </SystemModuleFrame>
  );
}

export function EmailServicesPanel({ snapshot: initial }: { snapshot: EmailServiceSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [testEmail, setTestEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <SystemModuleFrame title="Email Services" description="SMTP status, queue, and delivery logs">
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-3">
        <div className="space-y-2">
          <SystemMetric label="Connection" value={snapshot.connectionStatus} variant={snapshot.connectionStatus === "connected" ? "success" : "warning"} />
          <SystemMetric label="Sent (24h)" value={snapshot.sentCount24h} />
          <SystemMetric label="Failed (24h)" value={snapshot.failedCount24h} variant={snapshot.failedCount24h > 0 ? "warning" : "default"} />
          <SystemMetric label="Queued" value={snapshot.queuedCount} />
          <p className="text-[11px] text-muted-foreground">{snapshot.connectionMessage}</p>
          <div className="flex gap-2">
            <Input placeholder="test@company.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            <Button
              size="sm"
              disabled={isPending || !testEmail}
              onClick={() =>
                startTransition(async () => {
                  const res = await sendTestEmailAction(testEmail);
                  if (res.success) toast.success(res.message);
                  else toast.error(res.message);
                  const snap = await getEmailSnapshotAction();
                  if (snap.success) setSnapshot(snap.data);
                })
              }
            >
              Test
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const res = await retryFailedEmailsAction();
                if (res.success) toast.success(`Retried ${res.data} emails`);
              })
            }
          >
            Retry Failed
          </Button>
        </div>
        <SystemPanel title="Recent Logs" className="min-h-0 lg:col-span-2">
          <ul className="max-h-[220px] space-y-1 overflow-y-auto text-xs">
            {snapshot.recentLogs.map((log) => (
              <li key={log.id} className="flex justify-between gap-2 border-b py-1">
                <span className="truncate">{log.toEmail} — {log.subject}</span>
                <span className={log.status === "failed" ? "text-red-600" : "text-emerald-600"}>{log.status}</span>
              </li>
            ))}
          </ul>
        </SystemPanel>
      </div>
    </SystemModuleFrame>
  );
}

export { ApiKeysPanel } from "@/components/system-admin/api-keys-panel";

export function IntegrationsPanel({ integrations: initial }: { integrations: SystemIntegrationRow[] }) {
  const [items, setItems] = useState(initial);
  const [isPending, startTransition] = useTransition();

  return (
    <SystemModuleFrame title="Integrations" description="Connect enterprise services">
      <div className="grid max-h-[280px] gap-2 overflow-y-auto sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.label}</p>
              <span className={cn("text-xs", item.status === "connected" ? "text-emerald-600" : "text-muted-foreground")}>{item.status}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(async () => {
                const res = await toggleIntegrationAction(item.provider, item.status !== "connected");
                if (res.success) {
                  const list = await listIntegrationsAction();
                  if (list.success) setItems(list.data);
                  toast.success("Updated");
                } else toast.error(res.message);
              })}>{item.status === "connected" ? "Disconnect" : "Connect"}</Button>
              <Button size="sm" disabled={isPending} onClick={() => startTransition(async () => {
                const res = await syncIntegrationAction(item.provider);
                if (res.success) toast.success("Sync completed");
                else toast.error(res.message);
              })}>Sync</Button>
            </div>
            {item.lastError ? <p className="mt-1 text-xs text-red-600">{item.lastError}</p> : null}
          </div>
        ))}
      </div>
    </SystemModuleFrame>
  );
}

export function LicensePanel({
  licensePlan,
  licenseExpiresAt,
  licenseKey,
  activeUsers,
  remainingSeats,
  employeeLimit,
  storageLimitGb,
  apiUsage,
}: {
  licensePlan: string | null;
  licenseExpiresAt: string | null;
  licenseKey: string | null;
  activeUsers: number;
  remainingSeats: number | null;
  employeeLimit: number | null;
  storageLimitGb: number | null;
  apiUsage: number;
}) {
  return (
    <SystemModuleFrame title="License & Subscription">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SystemMetric label="Plan" value={licensePlan ?? "Enterprise"} />
        <SystemMetric label="Active Users" value={activeUsers} />
        <SystemMetric label="Remaining Seats" value={remainingSeats ?? "Unlimited"} />
        <SystemMetric label="API Usage" value={apiUsage} />
        <SystemMetric label="Employee Limit" value={employeeLimit ?? "Unlimited"} />
        <SystemMetric label="Storage Limit" value={storageLimitGb ? `${storageLimitGb} GB` : "Unlimited"} />
        <SystemMetric label="Expires" value={licenseExpiresAt ? new Date(licenseExpiresAt).toLocaleDateString() : "No expiry"} />
        <SystemMetric label="License Key" value={licenseKey ? `${licenseKey.slice(0, 8)}…` : "Not set"} />
      </div>
    </SystemModuleFrame>
  );
}

export function FeatureFlagsPanel({ settings }: { settings: SystemSettings }) {
  const flags = { ...Object.fromEntries(DEFAULT_FLAGS.map((f) => [f, false])), ...settings.featureFlags };
  const [isPending, startTransition] = useTransition();

  return (
    <SystemModuleFrame title="Feature Flags" description="Rollout and emergency controls">
      <ul className="max-h-[280px] space-y-2 overflow-y-auto">
        {Object.entries(flags).map(([key, enabled]) => (
          <li key={key} className="flex items-center justify-between rounded border p-2 text-sm">
            <span>{key}</span>
            <div className="flex items-center gap-2">
              <Input
                className="h-8 w-16 text-xs"
                type="number"
                min={0}
                max={100}
                defaultValue={settings.featureFlagRollouts[key]?.percentage ?? 100}
                onBlur={(e) =>
                  startTransition(async () => {
                    const res = await updateFeatureRolloutAction(key, {
                      percentage: Number(e.target.value),
                      environment: settings.environmentLabel,
                    });
                    if (!res.success) toast.error(res.message);
                  })
                }
              />
              <Button size="sm" variant={enabled ? "default" : "outline"} disabled={isPending} onClick={() =>
                startTransition(async () => {
                  const res = await updateFeatureFlagsAction({ [key]: !enabled });
                  if (!res.success) toast.error(res.message);
                })
              }>{enabled ? "On" : "Off"}</Button>
            </div>
          </li>
        ))}
      </ul>
    </SystemModuleFrame>
  );
}

export function MaintenancePanel({ settings }: { settings: SystemSettings }) {
  const [isPending, startTransition] = useTransition();

  return (
    <SystemModuleFrame title="Maintenance Mode">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded border p-3">
            <span className="text-sm">Maintenance {settings.maintenanceMode ? "ON" : "OFF"}</span>
            <Button size="sm" disabled={isPending} onClick={() => startTransition(async () => {
              const res = await updateMaintenanceModeAction(!settings.maintenanceMode, settings.maintenanceMessage);
              if (res.success) toast.success("Updated");
              else toast.error(res.message);
            })}>Toggle</Button>
          </div>
          <Label>Message</Label>
          <Input defaultValue={settings.maintenanceMessage ?? ""} onBlur={(e) => startTransition(async () => {
            await updateMaintenanceModeAction(settings.maintenanceMode, e.target.value);
          })} />
        </div>
        <div className="space-y-2">
          <Label>Scheduled at</Label>
          <Input type="datetime-local" defaultValue={settings.maintenanceScheduledAt?.slice(0, 16) ?? ""} onBlur={(e) => startTransition(async () => {
            const res = await updateMaintenanceScheduleAction({
              scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null,
              banner: settings.maintenanceBanner,
              allowedUsers: settings.maintenanceAllowedUsers,
              emergencyShutdown: settings.emergencyShutdown,
            });
            if (!res.success) toast.error(res.message);
          })} />
          <div className="flex items-center justify-between rounded border p-3">
            <span className="text-sm">Emergency shutdown</span>
            <Button size="sm" variant="destructive" disabled={isPending} onClick={() => startTransition(async () => {
              const res = await updateMaintenanceScheduleAction({
                scheduledAt: settings.maintenanceScheduledAt,
                banner: settings.maintenanceBanner,
                allowedUsers: settings.maintenanceAllowedUsers,
                emergencyShutdown: !settings.emergencyShutdown,
              });
              if (res.success) toast.success("Emergency shutdown toggled");
              else toast.error(res.message);
            })}>{settings.emergencyShutdown ? "Disable" : "Enable"}</Button>
          </div>
        </div>
      </div>
    </SystemModuleFrame>
  );
}

export function BackupPanel({ jobs: initial }: { jobs: BackupJobRow[] }) {
  const [jobs, setJobs] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const reload = () => startTransition(async () => {
    const res = await listBackupsAction();
    if (res.success) setJobs(res.data);
  });

  return (
    <SystemModuleFrame title="Backup & Restore" description="Export and restore organization data">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(["full", "employees", "payroll", "audit_logs"] as const).map((type) => (
            <Button key={type} size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(async () => {
              const res = await runBackupAction(type, "json");
              if (res.success) { toast.success(`Backup ${type} completed`); reload(); }
              else toast.error(res.message);
            })}>{type} JSON</Button>
          ))}
        </div>
        <SystemPanel className="min-h-0 flex-1">
          <ul className="max-h-[200px] space-y-2 overflow-y-auto text-xs">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-2 border-b py-1">
                <span>{job.backupType} · {job.format} · {job.status} · {job.recordCount ?? 0} rows</span>
                <div className="flex gap-1">
                  {job.status === "completed" ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => startTransition(async () => {
                        const res = await downloadBackupAction(job.id);
                        if (res.success) downloadBase64(res.data.filename, res.data.mimeType, res.data.contentBase64);
                        else toast.error(res.message);
                      })}>Download</Button>
                      <Button size="sm" variant="ghost" onClick={() => startTransition(async () => {
                        const res = await restoreBackupAction(job.id);
                        if (res.success) toast.success(`Restored ${res.data.recordCount} records`);
                        else toast.error(res.message);
                      })}>Restore</Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </SystemPanel>
      </div>
    </SystemModuleFrame>
  );
}

export function ImportExportPanel({ jobs: initial }: { jobs: ImportJobRow[] }) {
  const [jobs, setJobs] = useState(initial);
  const [isPending, startTransition] = useTransition();

  return (
    <SystemModuleFrame title="Import / Export">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(["employees", "departments", "roles", "attendance"] as const).map((mod) => (
            <Button key={mod} size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(async () => {
              const res = await exportModuleAction(mod, "csv");
              if (res.success) downloadBase64(res.data.filename, res.data.mimeType, res.data.contentBase64);
              else toast.error(res.message);
            })}>Export {mod}</Button>
          ))}
        </div>
        <Label>Import employees (CSV: email,first_name,last_name,employee_code)</Label>
        <Input type="file" accept=".csv,text/csv" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          file.text().then((content) => startTransition(async () => {
            const res = await importEmployeesAction(content);
            if (res.success) {
              toast.success(`Imported ${res.data.successCount} employees`);
              const list = await listImportJobsAction();
              if (list.success) setJobs(list.data);
            } else toast.error(res.message);
          }));
        }} />
        <SystemPanel title="Import History">
          <ul className="max-h-[120px] space-y-1 overflow-y-auto text-xs">
            {jobs.map((j) => (
              <li key={j.id}>{j.module} · {j.status} · ok {j.successCount} / err {j.errorCount}</li>
            ))}
          </ul>
        </SystemPanel>
      </div>
    </SystemModuleFrame>
  );
}

export function EnvironmentPanel({ env: initial, settings }: { env: EnvironmentSnapshot; settings: SystemSettings }) {
  const [env, setEnv] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const rows: Array<[string, string]> = [
    ["Environment", env.environment],
    ["Version", env.version],
    ["Build", env.buildNumber],
    ["Node", env.nodeVersion],
    ["Next.js", env.nextVersion],
    ["Database", env.databaseVersion],
    ["Region", env.region ?? "—"],
    ["Timezone", env.timezone],
    ["Storage", env.storageStatus],
    ["Email", env.emailStatus],
    ["API", env.apiStatus],
  ];

  return (
    <SystemModuleFrame title="Environment" description={env.readOnly ? "Read-only in production" : "Deployment metadata"}>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid gap-1 text-xs sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between rounded border px-2 py-1">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label>Environment label</Label>
          <Input
            defaultValue={settings.environmentLabel}
            disabled={env.readOnly || isPending}
            onBlur={(e) => startTransition(async () => {
              const res = await updateEnvironmentLabelAction(e.target.value);
              if (res.success) toast.success("Label updated");
              else toast.error(res.message);
              const snap = await getEnvironmentSnapshotAction();
              if (snap.success) setEnv(snap.data);
            })}
          />
        </div>
      </div>
    </SystemModuleFrame>
  );
}
