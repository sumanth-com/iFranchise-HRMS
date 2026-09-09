"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { ApiDocsPanel } from "@/components/system-admin/api-docs-panel";
import { ApiKeysPanel } from "@/components/system-admin/api-keys-panel";
import { ApiUsagePanel } from "@/components/system-admin/api-usage-panel";
import { ApiWebhooksPanel } from "@/components/system-admin/api-webhooks-panel";
import { Button } from "@/components/common/button";
import { SystemMetric, SystemPanel } from "@/components/system-admin/system-module-frame";
import type { SystemApiKeyRow } from "@/lib/system-admin/services/api-key-types";
import type { ApiManagementSnapshot } from "@/lib/system-admin/services/api-management-types";
import { updateApiSettingsAction } from "@/lib/system-admin/actions";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview", hint: "Status & traffic" },
  { id: "keys", label: "API Keys", hint: "Credentials" },
  { id: "docs", label: "Documentation", hint: "Endpoints" },
  { id: "usage", label: "Usage & Logs", hint: "Request history" },
  { id: "webhooks", label: "Webhooks", hint: "Event delivery" },
  { id: "settings", label: "Settings", hint: "Access controls" },
] as const;

export type ApiSectionId = (typeof SECTIONS)[number]["id"];

const ACTIVE_NAV_CLASS =
  "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm";

type Props = {
  snapshot: ApiManagementSnapshot;
  origin: string;
  initialSection?: ApiSectionId;
};

export function ApiManagementHub({
  snapshot,
  origin,
  initialSection = "overview",
}: Props) {
  const [section, setSection] = useState<ApiSectionId>(initialSection);
  const [config, setConfig] = useState(snapshot.config);
  const [keys, setKeys] = useState<SystemApiKeyRow[]>(snapshot.keys);
  const [webhooks, setWebhooks] = useState(snapshot.webhooks);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setKeys(snapshot.keys);
    setWebhooks(snapshot.webhooks);
    setConfig(snapshot.config);
  }, [snapshot]);

  const keyCounts = useMemo(() => {
    let active = 0;
    let revoked = 0;
    let expired = 0;
    for (const key of keys) {
      if (key.status === "active") active += 1;
      else if (key.status === "revoked") revoked += 1;
      else if (key.status === "expired") expired += 1;
    }
    return { active, revoked, expired };
  }, [keys]);

  const webhookStatus = useMemo(() => {
    if (!config.webhooksEnabled) return "Disabled";
    const active = webhooks.filter((hook) => hook.isActive).length;
    return active > 0 ? `${active} active` : "None configured";
  }, [config.webhooksEnabled, webhooks]);

  const activeSection = SECTIONS.find((item) => item.id === section) ?? SECTIONS[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:w-56">
        <div className="hidden shrink-0 border-b px-3.5 py-3 lg:block">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            API Management
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">Control plane</p>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0.5 lg:overflow-y-auto"
          aria-label="API sections"
        >
          {SECTIONS.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "flex shrink-0 flex-col rounded-lg px-3 py-2 text-left transition-colors lg:w-full lg:py-2.5",
                  isActive
                    ? ACTIVE_NAV_CLASS
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className={cn("text-sm whitespace-nowrap", isActive ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 hidden text-[11px] lg:block",
                    isActive ? "text-white/80" : "text-muted-foreground",
                  )}
                >
                  {item.hint}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="shrink-0 border-b px-4 py-3 md:px-5">
          <h2 className="text-base font-semibold tracking-tight">{activeSection.label}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Securely connect HRMS with CRM and other systems using authenticated APIs.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-3 md:p-4">
          {section === "overview" ? (
            <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Issue scoped API keys, inspect live traffic, and register webhooks for CRM
                  and payroll/attendance integrations. Secrets are hashed server-side and
                  shown only once.
                </p>
                <Button size="sm" onClick={() => setSection("keys")}>
                  Create API Key
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <SystemMetric
                  label="API status"
                  value={config.enabled ? "Enabled" : "Disabled"}
                  variant={config.enabled ? "success" : "danger"}
                />
                <SystemMetric label="API version" value={config.currentVersion} />
                <SystemMetric label="Active keys" value={keyCounts.active} />
                <SystemMetric
                  label="Revoked keys"
                  value={keyCounts.revoked}
                  hint={keyCounts.expired ? `${keyCounts.expired} expired` : undefined}
                />
                <SystemMetric label="Requests today" value={snapshot.metrics.requestsToday} />
                <SystemMetric
                  label="Failed requests"
                  value={snapshot.metrics.failedToday}
                  variant={snapshot.metrics.failedToday > 0 ? "warning" : "default"}
                />
                <SystemMetric
                  label="Rate-limit hits"
                  value={snapshot.metrics.rateLimitViolationsToday}
                  variant={snapshot.metrics.rateLimitViolationsToday > 0 ? "warning" : "default"}
                />
                <SystemMetric label="Webhooks" value={webhookStatus} />
              </div>
              <SystemPanel title="Recent API activity">
                {snapshot.recentLogs.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No API traffic yet. Create a key and call /api/v1/employees to see logs here.
                  </p>
                ) : (
                  <ul className="divide-y text-sm">
                    {snapshot.recentLogs.slice(0, 8).map((log) => (
                      <li
                        key={log.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <span className="font-mono text-xs">
                          {log.method} {log.path}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            log.statusCode >= 400 ? "text-red-600" : "text-emerald-600",
                          )}
                        >
                          {log.statusCode}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SystemPanel>
            </div>
          ) : null}

          {section === "keys" ? (
            <ApiKeysPanel keys={keys} onKeysChange={setKeys} />
          ) : null}
          {section === "docs" ? <ApiDocsPanel origin={origin} /> : null}
          {section === "usage" ? (
            <ApiUsagePanel
              metrics={snapshot.metrics}
              logs={snapshot.recentLogs}
              keys={keys}
            />
          ) : null}
          {section === "webhooks" ? (
            <ApiWebhooksPanel
              webhooks={webhooks}
              deliveries={snapshot.deliveries}
              enabled={config.webhooksEnabled}
              onWebhooksChange={setWebhooks}
            />
          ) : null}
          {section === "settings" ? (
            <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
              <SystemPanel title="API settings">
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <div>
                      <p className="font-medium">Public API</p>
                      <p className="text-xs text-muted-foreground">
                        Disable to reject all /api/v1 requests for this organization.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={config.enabled ? "outline" : "default"}
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await updateApiSettingsAction({
                            enabled: !config.enabled,
                          });
                          if (!res.success) {
                            toast.error(res.message);
                            return;
                          }
                          setConfig(res.data);
                          toast.success(res.data.enabled ? "API enabled" : "API disabled");
                        })
                      }
                    >
                      {config.enabled ? "Disable" : "Enable"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <div>
                      <p className="font-medium">Webhooks</p>
                      <p className="text-xs text-muted-foreground">
                        Stop outbound event delivery without deleting endpoints.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await updateApiSettingsAction({
                            webhooksEnabled: !config.webhooksEnabled,
                          });
                          if (!res.success) {
                            toast.error(res.message);
                            return;
                          }
                          setConfig(res.data);
                          toast.success("Webhook setting updated");
                        })
                      }
                    >
                      {config.webhooksEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div className="rounded-lg border px-3 py-2.5">
                    <p className="font-medium">Current version</p>
                    <p className="mt-1 text-muted-foreground">{config.currentVersion}</p>
                  </div>
                  <div className="rounded-lg border px-3 py-2.5">
                    <p className="font-medium">Default rate limit</p>
                    <p className="mt-1 text-muted-foreground">
                      {config.defaultRateLimitPerMinute} requests / minute (standard keys)
                    </p>
                  </div>
                  <div className="rounded-lg border px-3 py-2.5">
                    <p className="font-medium">Allowed environments</p>
                    <p className="mt-1 text-muted-foreground">
                      {config.allowedEnvironments.join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sandbox keys authenticate against the same organization data. Use a staging
                      project for a fully isolated sandbox.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Infrastructure secrets (Supabase, SMTP, signing keys) stay in environment
                    variables and are never shown here.
                  </p>
                </div>
              </SystemPanel>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
