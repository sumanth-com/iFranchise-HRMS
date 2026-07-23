"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  updateEnvironmentLabelAction,
  updateFeatureFlagsAction,
  updateMaintenanceModeAction,
} from "@/lib/system-admin/actions";
import type { SystemSettings } from "@/lib/system-admin/services/system-settings";

export type DatabaseHealthRow = {
  table: string;
  count: number;
  healthy: boolean;
};

type SystemModuleViewProps = {
  module: string;
  title: string;
  description: string;
  targetHref?: string;
  settings?: SystemSettings;
  databaseHealth?: DatabaseHealthRow[];
};

export function SystemModuleView({
  module,
  title,
  description,
  targetHref,
  settings,
  databaseHealth,
}: SystemModuleViewProps) {
  const [isPending, startTransition] = useTransition();

  if (targetHref) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Link
          href={targetHref}
          className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open {title}
          <ExternalLink className="size-4" />
        </Link>
      </div>
    );
  }

  if (module === "database" && databaseHealth) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {databaseHealth.map((row) => (
            <div key={row.table} className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm font-medium">{row.table}</p>
              <p className="mt-1 text-2xl font-semibold">{row.count.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.healthy ? "Healthy" : "Check required"}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (module === "maintenance" && settings) {
    return (
      <div className="max-w-xl space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Maintenance mode</p>
            <p className="text-xs text-muted-foreground">
              {settings.maintenanceMode ? "System is in maintenance" : "System is live"}
            </p>
          </div>
          <Button
            variant={settings.maintenanceMode ? "default" : "outline"}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateMaintenanceModeAction(!settings.maintenanceMode);
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                toast.success(
                  settings.maintenanceMode ? "Maintenance mode disabled" : "Maintenance mode enabled",
                );
              })
            }
          >
            {settings.maintenanceMode ? "Disable" : "Enable"}
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maintenance-message">Maintenance message</Label>
          <Input
            id="maintenance-message"
            defaultValue={settings.maintenanceMessage ?? ""}
            placeholder="We are performing scheduled maintenance..."
            onBlur={(event) => {
              const message = event.target.value.trim();
              startTransition(async () => {
                const result = await updateMaintenanceModeAction(settings.maintenanceMode, message);
                if (!result.success) toast.error(result.message);
              });
            }}
          />
        </div>
      </div>
    );
  }

  if (module === "feature-flags" && settings) {
    const flags = Object.entries(settings.featureFlags);
    return (
      <div className="max-w-xl space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {flags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feature flags configured yet.</p>
        ) : (
          <ul className="space-y-2">
            {flags.map(([key, enabled]) => (
              <li key={key} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{key}</span>
                <Button
                  size="sm"
                  variant={enabled ? "default" : "outline"}
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await updateFeatureFlagsAction({ [key]: !enabled });
                      if (!result.success) toast.error(result.message);
                    })
                  }
                >
                  {enabled ? "On" : "Off"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (module === "environment" && settings) {
    return (
      <div className="max-w-xl space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="environment-label">Environment label</Label>
          <Input
            id="environment-label"
            defaultValue={settings.environmentLabel}
            onBlur={(event) => {
              const label = event.target.value.trim();
              if (!label || label === settings.environmentLabel) return;
              startTransition(async () => {
                const result = await updateEnvironmentLabelAction(label);
                if (!result.success) toast.error(result.message);
                else toast.success("Environment updated");
              });
            }}
          />
        </div>
      </div>
    );
  }

  if (module === "license" && settings) {
    return (
      <div className="max-w-xl rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{settings.licensePlan ?? "Enterprise"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Expires</dt>
            <dd className="font-medium">
              {settings.licenseExpiresAt
                ? new Date(settings.licenseExpiresAt).toLocaleDateString()
                : "No expiry"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        This module is managed through your connected services. Use the HR portal modules for
        operational configuration where available.
      </p>
    </div>
  );
}
