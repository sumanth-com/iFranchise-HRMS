"use client";

import { useState } from "react";

import {
  ApiKeysPanel,
  BackupPanel,
  DatabaseHealthPanel,
  EmailServicesPanel,
  IntegrationsPanel,
  StorageManagerPanel,
} from "@/components/system-admin/system-admin-modules";
import type { SystemApiKeyRow } from "@/lib/system-admin/services/api-keys-service";
import type { BackupJobRow } from "@/lib/system-admin/services/backup-service";
import type { DatabaseHealthSnapshot } from "@/lib/system-admin/services/database-health-service";
import type { EmailServiceSnapshot } from "@/lib/system-admin/services/email-service";
import type { SystemIntegrationRow } from "@/lib/system-admin/services/integrations-service";
import type { StorageBucketSnapshot } from "@/lib/system-admin/services/storage-service";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "email", label: "Email / SMTP" },
  { id: "storage", label: "Storage" },
  { id: "integrations", label: "Integrations" },
  { id: "api-keys", label: "API Keys" },
  { id: "backup", label: "Backup" },
  { id: "database", label: "Database" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = {
  email: EmailServiceSnapshot;
  buckets: StorageBucketSnapshot[];
  organizationId: string;
  integrations: SystemIntegrationRow[];
  apiKeys: SystemApiKeyRow[];
  backupJobs: BackupJobRow[];
  database: DatabaseHealthSnapshot;
};

export function SystemIntegrationsHub({
  email,
  buckets,
  organizationId,
  integrations,
  apiKeys,
  backupJobs,
  database,
}: Props) {
  const [tab, setTab] = useState<TabId>("email");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:gap-4 md:p-5">
      <header className="shrink-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          System / Integrations
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Operational status for email, storage, integrations, API access, and
          backups. Secrets stay infrastructure-managed and are never shown here.
        </p>
      </header>

      <div className="flex shrink-0 justify-center">
        <nav
          className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
          aria-label="System integration sections"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                tab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "email" ? <EmailServicesPanel snapshot={email} /> : null}
        {tab === "storage" ? (
          <StorageManagerPanel buckets={buckets} organizationId={organizationId} />
        ) : null}
        {tab === "integrations" ? (
          <IntegrationsPanel integrations={integrations} />
        ) : null}
        {tab === "api-keys" ? <ApiKeysPanel keys={apiKeys} /> : null}
        {tab === "backup" ? <BackupPanel jobs={backupJobs} /> : null}
        {tab === "database" ? <DatabaseHealthPanel initial={database} /> : null}
      </div>
    </div>
  );
}
