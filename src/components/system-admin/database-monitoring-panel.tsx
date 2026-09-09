"use client";

import { format } from "date-fns";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { SystemMetric } from "@/components/system-admin/system-module-frame";
import { getDatabaseHealthAction } from "@/lib/system-admin/actions";
import type {
  DatabaseHealthIssue,
  DatabaseHealthSnapshot,
  DatabaseTableHealth,
} from "@/lib/system-admin/services/database-health-service";
import { cn } from "@/lib/utils";

const CTA =
  "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm hover:from-blue-500 hover:to-violet-500";

const INITIAL_TABLE_ROWS = 6;

function healthVariant(label: DatabaseHealthSnapshot["healthLabel"]) {
  if (label === "Healthy") return "success" as const;
  if (label === "Needs Attention") return "warning" as const;
  return "danger" as const;
}

function issueTone(severity: DatabaseHealthIssue["severity"]) {
  if (severity === "critical") return "border-red-200/80 bg-red-50/60";
  if (severity === "warning") return "border-amber-200/80 bg-amber-50/60";
  return "border-sky-200/80 bg-sky-50/50";
}

function statusBadge(table: DatabaseTableHealth) {
  if (table.status === "healthy") {
    return {
      label: "Healthy",
      className: "bg-emerald-500/10 text-emerald-700",
    };
  }
  if (table.status === "warning") {
    return {
      label: "Warning",
      className: "bg-amber-500/10 text-amber-800",
    };
  }
  return {
    label: "Error",
    className: "bg-red-500/10 text-red-700",
  };
}

export function DatabaseHealthPanel({ initial }: { initial: DatabaseHealthSnapshot }) {
  const [data, setData] = useState(initial);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [issueDetail, setIssueDetail] = useState<DatabaseHealthIssue | null>(null);
  const [showAllTables, setShowAllTables] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = (successMessage: string) =>
    startTransition(async () => {
      try {
        const res = await getDatabaseHealthAction();
        if (res.success) {
          setData(res.data);
          toast.success(successMessage);
        } else {
          toast.error(res.message);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Health check failed");
      }
    });

  const visibleTables = useMemo(() => {
    if (showAllTables) return data.tables;
    return data.tables.slice(0, INITIAL_TABLE_ROWS);
  }, [data.tables, showAllTables]);

  const attentionCount = data.issues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "warning",
  ).length;
  const infoCount = data.issues.filter((issue) => issue.severity === "info").length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain pb-1">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Database Monitoring</h2>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Monitor database connectivity, performance, storage, and table health.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => refresh("Metrics refreshed")}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Refresh Metrics
          </Button>
          <Button
            size="sm"
            className={CTA}
            disabled={isPending}
            onClick={() => refresh("Health check complete")}
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Activity className="size-3.5" />
            )}
            Run Health Check
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDetailsOpen(true)}>
            <Database className="size-3.5" />
            View Database Details
          </Button>
        </div>
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SystemMetric
          label="Connection"
          value={data.connected ? "Connected" : "Down"}
          variant={data.connected ? "success" : "danger"}
        />
        <SystemMetric
          label="Response latency"
          value={`${data.responseTimeMs}ms`}
          variant={data.responseTimeMs > 3000 ? "warning" : "default"}
        />
        <SystemMetric
          label="Database health"
          value={data.healthLabel}
          variant={healthVariant(data.healthLabel)}
          hint={
            attentionCount > 0
              ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} requiring attention`
              : undefined
          }
        />
        <SystemMetric label="Total records" value={data.totalRecords.toLocaleString()} />
      </div>

      <div className="grid shrink-0 gap-2 sm:grid-cols-3">
        <SystemMetric label="Active connections" value={data.activeConnectionsLabel} />
        <SystemMetric label="Storage usage" value={data.estimatedStorageLabel} />
        <SystemMetric
          label="Last health check"
          value={format(new Date(data.checkedAt), "dd MMM · HH:mm")}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.85fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Database Tables</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Monitor table availability and query health.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2 font-semibold">Table Name</th>
                  <th className="px-3 py-2 font-semibold">Records</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Last Checked</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleTables.map((table) => {
                  const badge = statusBadge(table);
                  return (
                    <tr key={table.table} className="hover:bg-muted/25">
                      <td className="px-3 py-2 font-medium">
                        <span className="font-mono text-[13px]">{table.table}</span>
                        {table.essential ? (
                          <span className="ml-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                            Core
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {table.healthy ? table.count.toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {format(new Date(data.checkedAt), "HH:mm:ss")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data.tables.length > INITIAL_TABLE_ROWS ? (
            <div className="shrink-0 border-t px-3 py-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-full justify-center text-xs"
                onClick={() => setShowAllTables((open) => !open)}
              >
                {showAllTables ? (
                  <>
                    <ChevronUp className="size-3.5" />
                    Show fewer tables
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" />
                    View all tables ({data.tables.length})
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight">Database Issues</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {attentionCount === 0
                ? infoCount > 0
                  ? `${infoCount} informational note${infoCount === 1 ? "" : "s"}`
                  : "No issues requiring attention"
                : `${attentionCount} item${attentionCount === 1 ? "" : "s"} requiring attention`}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {data.issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/40 px-3 py-6 text-center">
                <CheckCircle2 className="size-6 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">Database looks healthy</p>
                <p className="text-xs text-emerald-700/80">
                  Connection is up and monitored tables respond normally.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.issues.map((issue) => (
                  <li
                    key={issue.id}
                    className={cn("rounded-lg border px-3 py-2.5", issueTone(issue.severity))}
                  >
                    <div className="flex items-start gap-2">
                      <TriangleAlert
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          issue.severity === "critical"
                            ? "text-red-600"
                            : issue.severity === "warning"
                              ? "text-amber-600"
                              : "text-sky-600",
                        )}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold tracking-tight">{issue.title}</p>
                        <p className="text-xs leading-relaxed text-foreground/80">{issue.cause}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {issue.suggestedFix}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {issue.actionHref ? (
                            <Link
                              href={issue.actionHref}
                              className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted"
                            >
                              {issue.actionLabel ?? "Open"}
                              <ExternalLink className="size-3" />
                            </Link>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setIssueDetail(issue)}
                            >
                              {issue.actionLabel ?? "View details"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Database details"
        description="Current probe snapshot for this organization"
        contentClassName="sm:max-w-md"
        showCancel={false}
        footer={
          <Button variant="outline" onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        }
      >
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Overall health</dt>
            <dd className="font-medium">{data.healthLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Migration status</dt>
            <dd>{data.migrationStatus}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Last backup</dt>
            <dd>
              {data.lastBackupAt
                ? format(new Date(data.lastBackupAt), "dd MMM yyyy · HH:mm")
                : "None"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Tables monitored</dt>
            <dd>{data.tables.length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Healthy tables</dt>
            <dd>{data.tables.filter((table) => table.healthy).length}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Essential table failures</dt>
            <dd>{data.essentialTableFailures}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Checked at</dt>
            <dd>{format(new Date(data.checkedAt), "dd MMM yyyy · HH:mm:ss")}</dd>
          </div>
        </dl>
      </Modal>

      <Modal
        open={Boolean(issueDetail)}
        onOpenChange={(open) => (open ? undefined : setIssueDetail(null))}
        title={issueDetail?.title ?? "Issue details"}
        description="Diagnostics from the latest health probe"
        contentClassName="sm:max-w-md"
        showCancel={false}
        footer={
          <Button variant="outline" onClick={() => setIssueDetail(null)}>
            Close
          </Button>
        }
      >
        {issueDetail ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Severity
              </p>
              <p className="mt-0.5 capitalize">{issueDetail.severity}</p>
            </div>
            {issueDetail.table ? (
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Table
                </p>
                <p className="mt-0.5 font-mono text-xs">{issueDetail.table}</p>
              </div>
            ) : null}
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Finding
              </p>
              <p className="mt-0.5">{issueDetail.cause}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Recommended action
              </p>
              <p className="mt-0.5 text-muted-foreground">{issueDetail.suggestedFix}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
