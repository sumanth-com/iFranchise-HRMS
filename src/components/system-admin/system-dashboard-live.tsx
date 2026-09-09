"use client";

import { format } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { SystemDatabasePulse } from "@/components/system-admin/system-database-pulse";
import { SystemMetric, SystemPanel } from "@/components/system-admin/system-module-frame";
import { refreshSystemDashboardAction } from "@/lib/system-admin/actions";
import type { SystemDashboardStats } from "@/lib/system-admin/queries";
import { cn } from "@/lib/utils";

function healthLabel(health: SystemDashboardStats["systemHealth"]) {
  if (health === "healthy") return "Healthy";
  if (health === "degraded") return "Degraded";
  return "Critical";
}

function healthTone(health: SystemDashboardStats["systemHealth"]) {
  if (health === "healthy") return "text-emerald-600 bg-emerald-500/10";
  if (health === "degraded") return "text-amber-700 bg-amber-500/10";
  return "text-red-700 bg-red-500/10";
}

export function SystemDashboardLive({ initialStats }: { initialStats: SystemDashboardStats }) {
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const res = await refreshSystemDashboardAction();
      if (res.success) setStats(res.data);
    });
  }, []);

  const jobsWithActivity = stats.scheduledJobs.filter(
    (job) => job.lastRunAt || (job.lastStatus && job.lastStatus !== "idle"),
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">System Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational monitoring from real platform signals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
              healthTone(stats.systemHealth),
            )}
          >
            {healthLabel(stats.systemHealth)}
          </span>
          <Button size="sm" variant="outline" disabled={isPending} onClick={refresh}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <SystemMetric label="Active users" value={stats.activeEmployees} />
        <SystemMetric label="Logins today" value={stats.loginsToday} />
        <SystemMetric
          label="Failed logins"
          value={stats.failedLogins24h}
          variant={stats.failedLogins24h > 0 ? "warning" : "default"}
        />
        <SystemMetric
          label="DB response"
          value={`${stats.databaseResponseMs}ms`}
          variant={stats.databaseHealthy ? "success" : "danger"}
        />
        <SystemMetric
          label="Security fails"
          value={stats.securityAlerts24h}
          variant={stats.securityAlerts24h > 0 ? "warning" : "default"}
        />
        <SystemMetric label="Audit (24h)" value={stats.auditEvents24h} />
        <SystemMetric
          label="Email"
          value={stats.emailStatus}
          variant={stats.smtpConfigured ? "success" : "warning"}
        />
        <SystemMetric
          label="API"
          value={stats.apiStatus}
          variant={stats.databaseHealthy ? "success" : "danger"}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(22rem,1.15fr)]">
        <SystemPanel title="Recent errors" className="min-h-0" bodyClassName="min-h-0 flex-1 overflow-y-auto p-0">
          {stats.recentErrors.length === 0 ? (
            <p className="flex min-h-[12rem] items-center justify-center px-4 py-8 text-center text-sm text-emerald-600">
              No failed events in the last 24 hours.
            </p>
          ) : (
            <ul className="divide-y">
              {stats.recentErrors.map((event) => (
                <li key={event.id} className="px-4 py-3">
                  <p className="truncate text-sm font-medium">{event.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(event.occurredAt), "dd MMM · h:mm a")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SystemPanel>

        <SystemPanel title="Jobs & backup" className="min-h-0" bodyClassName="min-h-0 flex-1 overflow-y-auto p-0">
          <div className="space-y-0 divide-y">
            <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium">Backup</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  stats.lastBackupAt ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {stats.lastBackupAt
                  ? `Ready · ${format(new Date(stats.lastBackupAt), "dd MMM")}`
                  : stats.backupStatus}
              </span>
            </div>
            {jobsWithActivity.length === 0 ? (
              <p className="flex min-h-[10rem] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
                No scheduled job runs recorded yet.
              </p>
            ) : (
              jobsWithActivity.map((job) => (
                <div
                  key={job.jobKey}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span className="truncate">{job.jobName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground capitalize">
                    {job.lastStatus ?? "idle"}
                  </span>
                </div>
              ))
            )}
          </div>
        </SystemPanel>

        <SystemDatabasePulse
          className="min-h-0 lg:col-span-2 xl:col-span-1"
          healthy={stats.databaseHealthy}
          responseMs={stats.databaseResponseMs}
          activeEmployees={stats.activeEmployees}
          auditEvents24h={stats.auditEvents24h}
          storageBuckets={stats.storageBucketCount}
        />
      </div>
    </div>
  );
}
