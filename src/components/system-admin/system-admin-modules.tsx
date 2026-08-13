"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
import {
  downloadBackupAction,
  exportModuleAction,
  getDatabaseHealthAction,
  getEmailSnapshotAction,
  getEnvironmentSnapshotAction,
  listBackupsAction,
  listImportJobsAction,
  listIntegrationsAction,
  listStorageObjectsAction,
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

export { SystemDashboardLive } from "@/components/system-admin/system-dashboard-live";

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
    <SystemModuleFrame title="Database Health" description="Connection status, table counts, and issues">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <SystemMetric
            label="Status"
            value={data.connected ? "Connected" : "Down"}
            variant={data.connected ? "success" : "danger"}
          />
          <SystemMetric label="Response" value={`${data.responseTimeMs}ms`} />
          <SystemMetric label="Total Records" value={data.totalRecords.toLocaleString()} />
          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={isPending}
              onClick={refresh}
            >
              {isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Recheck
            </Button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2">
          <SystemPanel title="Tables" className="min-h-0" bodyClassName="p-0">
            {data.tables.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No tables listed.</p>
            ) : (
              <ul className="divide-y">
                {data.tables.map((t) => (
                  <li key={t.table} className="flex justify-between gap-3 px-4 py-2 text-sm">
                    <span className="truncate">{t.table}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.count.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SystemPanel>
          <SystemPanel title="Issues & Fixes" className="min-h-0" bodyClassName="p-0">
            {data.issues.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-emerald-600">No issues detected</p>
            ) : (
              <ul className="divide-y">
                {data.issues.map((issue, i) => (
                  <li key={i} className="space-y-1 px-4 py-3 text-sm">
                    <p className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
                      {issue.severity}
                    </p>
                    <p>{issue.cause}</p>
                    <p className="text-xs text-muted-foreground">{issue.suggestedFix}</p>
                  </li>
                ))}
              </ul>
            )}
          </SystemPanel>
        </div>
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
      <div className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]">
        <SystemPanel title="Buckets" className="min-h-0" bodyClassName="p-0">
          {buckets.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No buckets found.</p>
          ) : (
            <ul className="divide-y">
              {buckets.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-muted/60",
                      selectedBucket === b.id && "bg-muted",
                    )}
                    onClick={() => setSelectedBucket(b.id)}
                  >
                    <span className="truncate font-medium">{b.name}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">{b.fileCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SystemPanel>
        <SystemPanel title="Files" className="min-h-0">
          <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
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
          {objects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No items in this folder</p>
          ) : (
            <ul className="space-y-2">
              {objects.map((o) => (
                <li
                  key={o.path}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.displayName}</p>
                    {!o.isFolder && o.sizeBytes ? (
                      <p className="text-[11px] text-muted-foreground">
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
                      Open
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
              ))}
            </ul>
          )}
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
    <SystemModuleFrame
      title="Email Services"
      description="SMTP connection status, delivery metrics, and recent mail logs"
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <SystemMetric
            label="Connection"
            value={snapshot.connectionStatus}
            variant={snapshot.connectionStatus === "connected" ? "success" : "warning"}
          />
          <SystemMetric label="Sent (24h)" value={snapshot.sentCount24h} />
          <SystemMetric
            label="Failed (24h)"
            value={snapshot.failedCount24h}
            variant={snapshot.failedCount24h > 0 ? "warning" : "default"}
          />
          <SystemMetric label="Queued" value={snapshot.queuedCount} />
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
          <SystemPanel title="Tools" className="min-h-0">
            <div className="space-y-3">
              {snapshot.connectionMessage ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {snapshot.connectionMessage}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="email-test-recipient">Send test email</Label>
                <div className="flex gap-2">
                  <Input
                    id="email-test-recipient"
                    type="email"
                    placeholder="you@company.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={isPending || !testEmail.trim()}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await sendTestEmailAction(testEmail.trim());
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
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={isPending || snapshot.failedCount24h === 0}
                onClick={() =>
                  startTransition(async () => {
                    const res = await retryFailedEmailsAction();
                    if (res.success) {
                      toast.success(`Retried ${res.data} emails`);
                      const snap = await getEmailSnapshotAction();
                      if (snap.success) setSnapshot(snap.data);
                    } else toast.error(res.message);
                  })
                }
              >
                Retry failed
              </Button>
            </div>
          </SystemPanel>

          <SystemPanel title="Recent Logs" className="min-h-0" bodyClassName="p-0">
            {snapshot.recentLogs.length === 0 ? (
              <div className="flex min-h-[12rem] items-center justify-center px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No recent email logs yet.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {snapshot.recentLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{log.toEmail}</p>
                      <p className="truncate text-xs text-muted-foreground">{log.subject}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium capitalize",
                        log.status === "failed" ? "text-red-600" : "text-emerald-600",
                      )}
                    >
                      {log.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SystemPanel>
        </div>
      </div>
    </SystemModuleFrame>
  );
}

export { ApiKeysPanel } from "@/components/system-admin/api-keys-panel";

export function IntegrationsPanel({ integrations: initial }: { integrations: SystemIntegrationRow[] }) {
  const [items, setItems] = useState(initial);
  const [isPending, startTransition] = useTransition();

  return (
    <SystemModuleFrame
      title="Integrations"
      description="Available enterprise connectors. Status stays disconnected until credentials are configured."
    >
      {items.length === 0 ? (
        <div className="flex h-full min-h-[12rem] items-center justify-center rounded-xl border bg-card">
          <p className="text-sm text-muted-foreground">No integrations listed.</p>
        </div>
      ) : (
        <div className="grid h-full min-h-0 auto-rows-min gap-3 overflow-y-auto overscroll-contain sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{item.label}</p>
                <span
                  className={cn(
                    "text-xs font-medium capitalize",
                    item.status === "connected"
                      ? "text-emerald-600"
                      : "text-muted-foreground",
                  )}
                >
                  {item.configured ? item.status : "Not configured"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {item.configured
                  ? "Credentials are present. Connect or sync when ready."
                  : "No credentials configured yet — this connector is available but not connected."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending || !item.configured}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await toggleIntegrationAction(
                        item.provider,
                        item.status !== "connected",
                      );
                      if (res.success) {
                        const list = await listIntegrationsAction();
                        if (list.success) setItems(list.data);
                        toast.success("Updated");
                      } else toast.error(res.message);
                    })
                  }
                >
                  {item.status === "connected" ? "Disconnect" : "Connect"}
                </Button>
                <Button
                  size="sm"
                  disabled={isPending || !item.configured || item.status !== "connected"}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await syncIntegrationAction(item.provider);
                      if (res.success) toast.success("Sync completed");
                      else toast.error(res.message);
                    })
                  }
                >
                  Sync
                </Button>
              </div>
              {item.lastError ? (
                <p className="mt-2 text-xs text-red-600">{item.lastError}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
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
        <div className="flex shrink-0 flex-wrap gap-2">
          {(["full", "employees", "payroll", "audit_logs"] as const).map((type) => (
            <Button
              key={type}
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await runBackupAction(type, "json");
                  if (res.success) {
                    toast.success(`Backup ${type} completed`);
                    reload();
                  } else toast.error(res.message);
                })
              }
            >
              {type.replace("_", " ")} JSON
            </Button>
          ))}
        </div>
        <SystemPanel title="Backup Jobs" className="min-h-0 flex-1" bodyClassName="p-0">
          {jobs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No backup jobs yet.
            </p>
          ) : (
            <ul className="divide-y">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium capitalize">
                      {job.backupType.replace("_", " ")} · {job.format}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.status} · {job.recordCount ?? 0} rows
                    </p>
                  </div>
                  {job.status === "completed" ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          startTransition(async () => {
                            const res = await downloadBackupAction(job.id);
                            if (res.success) {
                              downloadBase64(
                                res.data.filename,
                                res.data.mimeType,
                                res.data.contentBase64,
                              );
                            } else toast.error(res.message);
                          })
                        }
                      >
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          startTransition(async () => {
                            const res = await restoreBackupAction(job.id);
                            if (res.success) {
                              toast.success(`Restored ${res.data.recordCount} records`);
                            } else toast.error(res.message);
                          })
                        }
                      >
                        Restore
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
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
