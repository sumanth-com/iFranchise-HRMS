"use client";

import { useMemo, useState } from "react";

import { ApiDocsPanel } from "@/components/system-admin/api-docs-panel";
import { ApiKeysPanel } from "@/components/system-admin/api-keys-panel";
import { ApiUsagePanel } from "@/components/system-admin/api-usage-panel";
import { ApiWebhooksPanel } from "@/components/system-admin/api-webhooks-panel";
import { Button } from "@/components/common/button";
import { SystemMetric, SystemModuleFrame, SystemPanel } from "@/components/system-admin/system-module-frame";
import type { ApiManagementSnapshot } from "@/lib/system-admin/services/api-management-types";
import { updateApiSettingsAction } from "@/lib/system-admin/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTransition } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "keys", label: "API Keys" },
  { id: "docs", label: "Documentation" },
  { id: "usage", label: "Usage / Logs" },
  { id: "webhooks", label: "Webhooks" },
  { id: "settings", label: "Settings" },
] as const;

export type ApiSectionId = (typeof SECTIONS)[number]["id"];

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
  const [isPending, startTransition] = useTransition();

  const webhookStatus = useMemo(() => {
    if (!config.webhooksEnabled) return "Disabled";
    const active = snapshot.webhooks.filter((hook) => hook.isActive).length;
    return active > 0 ? `${active} active` : "None configured";
  }, [config.webhooksEnabled, snapshot.webhooks]);

  return (
    <SystemModuleFrame
      title="API Management"
      description="Securely connect HRMS with CRM and other business systems using authenticated APIs."
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <nav
          className="flex shrink-0 flex-wrap gap-1 rounded-lg border bg-card p-1"
          aria-label="API management sections"
        >
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                section === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-hidden">
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
                <SystemMetric label="Active keys" value={snapshot.activeKeys} />
                <SystemMetric
                  label="Revoked keys"
                  value={snapshot.revokedKeys}
                  hint={snapshot.expiredKeys ? `${snapshot.expiredKeys} expired` : undefined}
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
                      <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
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

          {section === "keys" ? <ApiKeysPanel keys={snapshot.keys} /> : null}
          {section === "docs" ? <ApiDocsPanel origin={origin} /> : null}
          {section === "usage" ? (
            <ApiUsagePanel
              metrics={snapshot.metrics}
              logs={snapshot.recentLogs}
              keys={snapshot.keys}
            />
          ) : null}
          {section === "webhooks" ? (
            <ApiWebhooksPanel
              webhooks={snapshot.webhooks}
              deliveries={snapshot.deliveries}
              enabled={config.webhooksEnabled}
            />
          ) : null}
          {section === "settings" ? (
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
                        const res = await updateApiSettingsAction({ enabled: !config.enabled });
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
          ) : null}
        </div>
      </div>
    </SystemModuleFrame>
  );
}
