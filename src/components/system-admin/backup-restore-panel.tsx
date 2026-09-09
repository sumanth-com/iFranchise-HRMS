"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { SystemMetric } from "@/components/system-admin/system-module-frame";
import { downloadBase64 } from "@/components/system-admin/system-module-frame";
import {
  downloadBackupAction,
  listBackupsAction,
  restoreBackupAction,
  runBackupAction,
  updateBackupScheduleAction,
} from "@/lib/system-admin/actions";
import {
  BACKUP_SCOPE_OPTIONS,
  getBackupFailureAction,
  getBackupFailureIssue,
  toFriendlyBackupError,
  type BackupJobRow,
  type BackupOperationsSnapshot,
  type BackupScheduleFrequency,
  type BackupType,
} from "@/lib/system-admin/services/backup-types";
import { cn } from "@/lib/utils";

const CTA =
  "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm hover:from-blue-500 hover:to-violet-500";

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function backupTypeLabel(type: string) {
  const match = BACKUP_SCOPE_OPTIONS.find((scope) => scope.id === type);
  if (match) return match.label;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700";
  if (status === "failed") return "bg-amber-500/10 text-amber-800";
  if (status === "running" || status === "pending") return "bg-blue-500/10 text-blue-700";
  return "bg-muted text-muted-foreground";
}

function statusLabel(status: string) {
  if (status === "completed") return "Successful";
  if (status === "failed") return "Failed";
  if (status === "running" || status === "pending") return "In Progress";
  return status;
}

type HistoryRow = BackupJobRow & { repeatFailures?: number; secondary?: boolean };

function buildHistoryRows(jobs: BackupJobRow[]): HistoryRow[] {
  const primary: HistoryRow[] = [];
  const failedRows: HistoryRow[] = [];
  const seenFailedKeys = new Set<string>();

  for (const job of jobs) {
    if (job.status !== "failed") {
      primary.push(job);
      continue;
    }

    const key = `${job.backupType}::${job.errorMessage ?? "unknown"}`;
    if (seenFailedKeys.has(key)) continue;
    seenFailedKeys.add(key);

    const repeatFailures = jobs.filter(
      (candidate) =>
        candidate.status === "failed" &&
        candidate.backupType === job.backupType &&
        (candidate.errorMessage ?? "unknown") === (job.errorMessage ?? "unknown"),
    ).length;

    failedRows.push({ ...job, repeatFailures, secondary: true });
  }

  // Successful / in-progress first; collapsed historical failures secondary.
  return [...primary, ...failedRows];
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function BackupPanel({ initial }: { initial: BackupOperationsSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [scope, setScope] = useState<BackupType>("full");
  const [formatType, setFormatType] = useState<"json" | "csv">("json");
  const [frequency, setFrequency] = useState<BackupScheduleFrequency>(initial.scheduleFrequency);
  const [retentionDays, setRetentionDays] = useState(String(initial.retentionDays));
  const [restoreJob, setRestoreJob] = useState<BackupJobRow | null>(null);
  const [detailsJob, setDetailsJob] = useState<HistoryRow | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [activeBackupType, setActiveBackupType] = useState<BackupType | null>(null);
  const [isPending, startTransition] = useTransition();
  const backupInFlight = useRef(false);

  const history = useMemo(() => buildHistoryRows(snapshot.jobs), [snapshot.jobs]);
  const failedHistoryCount = history.filter((job) => job.status === "failed").length;

  const applySnapshot = (next: BackupOperationsSnapshot) => {
    setSnapshot(next);
    setFrequency(next.scheduleFrequency);
    setRetentionDays(String(next.retentionDays));
  };

  const reload = () =>
    startTransition(async () => {
      const res = await listBackupsAction();
      if (res.success) applySnapshot(res.data);
      else toast.error(toFriendlyBackupError(res.message));
    });

  const openDetails = (job: HistoryRow) => {
    setShowTechnical(false);
    setDetailsJob(job);
  };

  const runBackup = (type: BackupType = scope, formatOverride?: "json" | "csv") => {
    if (backupInFlight.current || isPending) return;
    backupInFlight.current = true;
    setActiveBackupType(type);
    const format = formatOverride ?? formatType;

    startTransition(async () => {
      try {
        const res = await runBackupAction(type, format);
        if (res.success) {
          applySnapshot(res.snapshot);
          toast.success(`${backupTypeLabel(type)} completed`, {
            description: `${res.data.recordCount ?? 0} records · ${formatBytes(res.data.fileSizeBytes)}`,
          });
        } else {
          toast.error(toFriendlyBackupError(res.message), {
            description: getBackupFailureAction(),
          });
          const refreshed = await listBackupsAction();
          if (refreshed.success) applySnapshot(refreshed.data);
        }
      } finally {
        backupInFlight.current = false;
        setActiveBackupType(null);
      }
    });
  };

  const overviewStatus =
    snapshot.status === "healthy"
      ? "Protected"
      : snapshot.status === "failed"
        ? "Needs attention"
        : snapshot.status === "attention"
          ? "In progress"
          : "No backups yet";

  const creatingLabel = activeBackupType
    ? `Creating ${backupTypeLabel(activeBackupType)}…`
    : "Create Backup Now";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Backup & Restore</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Overview → schedule → create → history. Destructive restore stays confirmed and isolated.
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={isPending} onClick={reload}>
          {isPending && !activeBackupType ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <SystemMetric
          label="Last successful"
          value={
            snapshot.lastSuccessfulAt
              ? format(new Date(snapshot.lastSuccessfulAt), "dd MMM · HH:mm")
              : "Never"
          }
          variant={snapshot.lastSuccessfulAt ? "success" : "warning"}
        />
        <SystemMetric
          label="Next scheduled"
          value={
            snapshot.nextScheduledAt
              ? format(new Date(snapshot.nextScheduledAt), "dd MMM · HH:mm")
              : "—"
          }
        />
        <SystemMetric
          label="Backup status"
          value={overviewStatus}
          variant={
            snapshot.status === "healthy"
              ? "success"
              : snapshot.status === "failed"
                ? "danger"
                : snapshot.status === "attention"
                  ? "warning"
                  : "default"
          }
        />
        <SystemMetric label="Total backup size" value={snapshot.storageUsageLabel} />
        <SystemMetric label="Retention" value={`${snapshot.retentionDays} days`} />
        <SystemMetric
          label="Storage usage"
          value={`${snapshot.completedCount} files`}
          hint={
            failedHistoryCount > 0
              ? `${failedHistoryCount} earlier failed attempt${failedHistoryCount === 1 ? "" : "s"}`
              : undefined
          }
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain">
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Create backup
            </p>
            <div className="mt-3 space-y-2">
              {BACKUP_SCOPE_OPTIONS.map((option) => {
                const active = scope === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => setScope(option.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-transparent bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm"
                        : "hover:bg-muted/60",
                      isPending && "opacity-70",
                    )}
                  >
                    <p className={cn("text-sm font-medium", active && "font-semibold")}>
                      {option.label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[11px]",
                        active ? "text-white/80" : "text-muted-foreground",
                      )}
                    >
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              {(["json", "csv"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={isPending}
                  onClick={() => setFormatType(item)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium uppercase",
                    formatType === item
                      ? "bg-gradient-to-r from-blue-600/15 to-violet-600/15 text-violet-700"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              <Button className={CTA} disabled={isPending} onClick={() => runBackup()}>
                {activeBackupType ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <HardDrive className="size-3.5" />
                )}
                {creatingLabel}
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !snapshot.jobs.find((j) => j.status === "completed")}
                onClick={() => {
                  const latest = snapshot.jobs.find((j) => j.status === "completed");
                  if (!latest) return;
                  startTransition(async () => {
                    const res = await downloadBackupAction(latest.id);
                    if (res.success) {
                      downloadBase64(res.data.filename, res.data.mimeType, res.data.contentBase64);
                      toast.success("Download started");
                    } else toast.error(toFriendlyBackupError(res.message));
                  });
                }}
              >
                <Download className="size-3.5" />
                Download Latest Export
              </Button>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-violet-600" />
              <p className="text-sm font-semibold">Schedule & retention</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Automatic backups use existing scheduled jobs. Retention guides cleanup policy.
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground uppercase">
                  Frequency
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(["hourly", "daily", "weekly"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={isPending}
                      onClick={() => setFrequency(item)}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-medium capitalize",
                        frequency === item
                          ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                          : "border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground uppercase">
                  Retention (days)
                </label>
                <input
                  type="number"
                  min={7}
                  max={3650}
                  value={retentionDays}
                  disabled={isPending}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="h-8 w-full rounded-lg border bg-background px-3 text-sm"
                />
              </div>
              <Button
                size="sm"
                className={cn("w-full", CTA)}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const days = Number(retentionDays);
                    if (!Number.isFinite(days)) {
                      toast.error("Enter a valid retention period");
                      return;
                    }
                    const res = await updateBackupScheduleAction({
                      frequency,
                      retentionDays: days,
                    });
                    if (res.success) {
                      applySnapshot(res.data);
                      toast.success("Backup schedule updated");
                    } else toast.error(toFriendlyBackupError(res.message));
                  })
                }
              >
                Schedule Backup
              </Button>
              <p className="text-[11px] text-muted-foreground">{snapshot.scheduleLabel}</p>
            </div>
          </section>

          <section className="rounded-xl border border-red-200/80 bg-red-50/40 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="size-4" />
              <p className="text-sm font-semibold">Destructive actions</p>
            </div>
            <p className="mt-1 text-xs text-red-700/80">
              Restore overwrites live records from a completed export. Always confirm before
              continuing.
            </p>
            <Button
              size="sm"
              variant="destructive"
              className="mt-3 w-full"
              disabled={isPending || !snapshot.jobs.some((j) => j.status === "completed")}
              onClick={() => {
                const latest = snapshot.jobs.find((j) => j.status === "completed") ?? null;
                setRestoreJob(latest);
              }}
            >
              <RotateCcw className="size-3.5" />
              Restore Backup…
            </Button>
          </section>
        </div>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Backup history
            </p>
            <p className="mt-0.5 text-sm font-medium">Jobs, status, and recovery actions</p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {history.length === 0 ? (
              <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 px-4 text-center">
                <CheckCircle2 className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No backup history yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Create a Full System Backup to establish your first recovery point.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-violet-600 text-white">
                  <tr className="text-[11px] tracking-wide uppercase">
                    <th className="px-3 py-2.5 font-semibold">Backup</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Created</th>
                    <th className="px-3 py-2.5 font-semibold">Size</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((job) => (
                    <tr
                      key={job.id}
                      className={cn(
                        "align-top hover:bg-muted/30",
                        job.secondary && "bg-muted/20 text-muted-foreground",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <p className={cn("font-medium", job.secondary && "text-foreground/80")}>
                          {backupTypeLabel(job.backupType)}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {job.id.slice(0, 8)}
                        </p>
                        {job.status === "failed" ? (
                          <p className="mt-1 max-w-xs text-[11px] text-amber-700">
                            Backup could not complete
                            {job.repeatFailures && job.repeatFailures > 1
                              ? ` · ${job.repeatFailures} similar failures collapsed`
                              : null}
                            <button
                              type="button"
                              className="ml-1 font-medium text-amber-800 underline underline-offset-2"
                              onClick={() => openDetails(job)}
                            >
                              View details
                            </button>
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 uppercase text-muted-foreground">{job.format}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {format(new Date(job.createdAt), "dd MMM yyyy · HH:mm")}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{formatBytes(job.fileSizeBytes)}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            statusTone(job.status),
                          )}
                        >
                          {statusLabel(job.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Button size="xs" variant="ghost" onClick={() => openDetails(job)}>
                            View
                          </Button>
                          {job.status === "completed" ? (
                            <>
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={isPending}
                                onClick={() =>
                                  startTransition(async () => {
                                    const res = await downloadBackupAction(job.id);
                                    if (res.success) {
                                      downloadBase64(
                                        res.data.filename,
                                        res.data.mimeType,
                                        res.data.contentBase64,
                                      );
                                      toast.success("Download started");
                                    } else toast.error(toFriendlyBackupError(res.message));
                                  })
                                }
                              >
                                Download
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                disabled={isPending}
                                onClick={() => setRestoreJob(job)}
                              >
                                Restore
                              </Button>
                            </>
                          ) : null}
                          {job.status === "failed" ? (
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={isPending}
                              onClick={() =>
                                runBackup(
                                  job.backupType as BackupType,
                                  (job.format === "csv" ? "csv" : "json") as "json" | "csv",
                                )
                              }
                            >
                              {activeBackupType === job.backupType ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : null}
                              Retry
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(restoreJob)}
        onOpenChange={(open) => {
          if (!open) setRestoreJob(null);
        }}
        title="Restore backup?"
        description={
          restoreJob
            ? `This will restore ${backupTypeLabel(restoreJob.backupType)} from ${format(new Date(restoreJob.createdAt), "dd MMM yyyy HH:mm")}.`
            : undefined
        }
        contentClassName="sm:max-w-lg"
        showCancel={false}
        footer={
          <>
            <Button variant="outline" disabled={isPending} onClick={() => setRestoreJob(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending || !restoreJob}
              onClick={() => {
                if (!restoreJob) return;
                startTransition(async () => {
                  const res = await restoreBackupAction(restoreJob.id);
                  if (res.success) {
                    toast.success(`Restored ${res.data.recordCount} records`);
                    setRestoreJob(null);
                    reload();
                  } else toast.error(toFriendlyBackupError(res.message));
                });
              }}
            >
              {isPending ? "Restoring…" : "Confirm restore"}
            </Button>
          </>
        }
      >
        <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">This can overwrite live data</p>
            <p className="text-muted-foreground">
              Prefer downloading the export first. Restore only when recovering from data loss or
              corruption.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detailsJob)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsJob(null);
            setShowTechnical(false);
          }
        }}
        title="Backup Details"
        description={detailsJob ? backupTypeLabel(detailsJob.backupType) : undefined}
        contentClassName="sm:max-w-lg"
        showCancel={false}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {detailsJob?.status === "failed" ? (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  const job = detailsJob;
                  setDetailsJob(null);
                  setShowTechnical(false);
                  if (!job) return;
                  runBackup(
                    job.backupType as BackupType,
                    (job.format === "csv" ? "csv" : "json") as "json" | "csv",
                  );
                }}
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Retry backup
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="outline"
              onClick={() => {
                setDetailsJob(null);
                setShowTechnical(false);
              }}
            >
              Close
            </Button>
          </div>
        }
      >
        {detailsJob ? (
          <div className="space-y-4">
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3",
                detailsJob.status === "completed"
                  ? "border-emerald-200 bg-emerald-50/80"
                  : detailsJob.status === "failed"
                    ? "border-amber-200 bg-amber-50/80"
                    : "border-border bg-muted/40",
              )}
            >
              {detailsJob.status === "completed" ? (
                <ShieldCheck className="size-5 text-emerald-600" />
              ) : detailsJob.status === "failed" ? (
                <XCircle className="size-5 text-amber-600" />
              ) : (
                <Loader2 className="size-5 animate-spin text-blue-600" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {detailsJob.status === "completed"
                    ? "Backup completed successfully"
                    : detailsJob.status === "failed"
                      ? "Backup did not complete"
                      : "Backup in progress"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {backupTypeLabel(detailsJob.backupType)} · {detailsJob.format.toUpperCase()}
                </p>
              </div>
              <span
                className={cn(
                  "ml-auto inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  statusTone(detailsJob.status),
                )}
              >
                {statusLabel(detailsJob.status)}
              </span>
            </div>

            <dl>
              <DetailRow label="Backup ID" value={<span className="font-mono text-xs">{detailsJob.id}</span>} />
              <DetailRow label="Backup Type" value={backupTypeLabel(detailsJob.backupType)} />
              <DetailRow label="Format" value={detailsJob.format.toUpperCase()} />
              <DetailRow
                label="Created"
                value={format(new Date(detailsJob.createdAt), "dd MMM yyyy · HH:mm")}
              />
              <DetailRow label="Backup Size" value={formatBytes(detailsJob.fileSizeBytes)} />
              <DetailRow
                label="Duration"
                value={
                  detailsJob.durationMs != null
                    ? `${Math.max(1, Math.round(detailsJob.durationMs / 1000))}s`
                    : "—"
                }
              />
              <DetailRow
                label="Records Included"
                value={detailsJob.recordCount != null ? detailsJob.recordCount.toLocaleString() : "—"}
              />
            </dl>

            {detailsJob.status === "failed" ? (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
                    Issue
                  </p>
                  <p className="mt-1 text-sm text-amber-950">{getBackupFailureIssue()}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
                    Recommended action
                  </p>
                  <p className="mt-1 text-sm text-amber-950">{getBackupFailureAction()}</p>
                </div>

                {detailsJob.technicalDetails ? (
                  <div className="border-t border-amber-200/80 pt-3">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-amber-900"
                      onClick={() => setShowTechnical((open) => !open)}
                    >
                      Technical Details
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform",
                          showTechnical && "rotate-180",
                        )}
                      />
                    </button>
                    {showTechnical ? (
                      <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-amber-200 bg-white/80 px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {detailsJob.technicalDetails}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
