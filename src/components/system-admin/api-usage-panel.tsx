"use client";

import { format, parseISO } from "date-fns";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { SystemMetric, SystemPanel } from "@/components/system-admin/system-module-frame";
import { fetchApiUsageLogsAction } from "@/lib/system-admin/actions";
import type { ApiUsageLogRow, ApiUsageMetrics } from "@/lib/public-api/usage-types";
import type { SystemApiKeyRow } from "@/lib/system-admin/services/api-key-types";
import { cn } from "@/lib/utils";

export function ApiUsagePanel({
  metrics,
  logs: initialLogs,
  keys,
}: {
  metrics: ApiUsageMetrics;
  logs: ApiUsageLogRow[];
  keys: SystemApiKeyRow[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [apiKeyId, setApiKeyId] = useState("all");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [endpoint, setEndpoint] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyFilters() {
    startTransition(async () => {
      const result = await fetchApiUsageLogsAction({
        apiKeyId: apiKeyId === "all" ? undefined : apiKeyId,
        method: method === "all" ? undefined : method,
        status:
          status === "success" || status === "failed" || status === "rate_limited"
            ? status
            : undefined,
        endpoint: endpoint.trim() || undefined,
        page: 1,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setLogs(result.data.data);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SystemMetric label="Requests today" value={metrics.requestsToday} />
        <SystemMetric label="Successful" value={metrics.successfulToday} variant="success" />
        <SystemMetric label="Failed" value={metrics.failedToday} variant={metrics.failedToday ? "warning" : "default"} />
        <SystemMetric
          label="Avg response"
          value={metrics.averageResponseTimeMs != null ? `${metrics.averageResponseTimeMs} ms` : "—"}
        />
        <SystemMetric
          label="429s today"
          value={metrics.rateLimitViolationsToday}
          variant={metrics.rateLimitViolationsToday ? "warning" : "default"}
        />
      </div>
      <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={apiKeyId} onValueChange={(value) => value && setApiKeyId(value)}>
          <SelectTrigger>
            <SelectValue placeholder="API key" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All keys</SelectItem>
            {keys.map((key) => (
              <SelectItem key={key.id} value={key.id}>
                {key.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={(value) => value && setMethod(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => value && setStatus(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rate_limited">Rate limited</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={endpoint}
          placeholder="Filter endpoint"
          onChange={(event) => setEndpoint(event.target.value)}
        />
        <Button size="sm" disabled={isPending} onClick={applyFilters}>
          Apply filters
        </Button>
      </div>
      <SystemPanel title="Request log" className="min-h-0 flex-1" bodyClassName="p-0">
        {logs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No matching API requests. Secrets and Authorization headers are never stored.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="sticky top-0 z-30 bg-black text-left shadow-[0_1px_0_rgba(255,255,255,0.08)]">
                <tr>
                  <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Time</th>
                  <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Key</th>
                  <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Method</th>
                  <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Endpoint</th>
                  <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
                  <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">ms</th>
                  <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">IP</th>
                  <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Request ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {format(parseISO(log.createdAt), "d MMM HH:mm:ss")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{log.keyPrefix ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{log.method}</td>
                    <td className="max-w-[18rem] truncate px-3 py-2 font-mono text-xs">{log.path}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-xs font-medium",
                        log.statusCode >= 400 ? "text-red-600" : "text-emerald-600",
                      )}
                    >
                      {log.statusCode}
                    </td>
                    <td className="px-3 py-2 text-xs tabular-nums">{log.responseTimeMs ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{log.ipAddress ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{log.requestId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SystemPanel>
    </div>
  );
}
