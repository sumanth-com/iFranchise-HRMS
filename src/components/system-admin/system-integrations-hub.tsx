"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  ApiManagementHub,
  type ApiSectionId,
} from "@/components/system-admin/api-management-hub";
import {
  BackupPanel,
  DatabaseHealthPanel,
  EmailServicesPanel,
  StorageManagerPanel,
} from "@/components/system-admin/system-admin-modules";
import { Button } from "@/components/common/button";
import { loadInfrastructureTabAction } from "@/lib/system-admin/infrastructure-actions";
import type {
  InfrastructureTabId,
  InfrastructureTabResult,
} from "@/lib/system-admin/infrastructure-types";
import type { ApiManagementSnapshot } from "@/lib/system-admin/services/api-management-types";
import type { BackupOperationsSnapshot } from "@/lib/system-admin/services/backup-types";
import type { DatabaseHealthSnapshot } from "@/lib/system-admin/services/database-health-service";
import type { EmailServiceSnapshot } from "@/lib/system-admin/services/email-service";
import type { StorageBucketSnapshot } from "@/lib/system-admin/services/storage-types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "email", label: "Email / SMTP" },
  { id: "storage", label: "Storage" },
  { id: "api", label: "API" },
  { id: "backup", label: "Backup" },
  { id: "database", label: "Database" },
] as const satisfies ReadonlyArray<{ id: InfrastructureTabId; label: string }>;

const ACTIVE_TAB_CLASS =
  "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm font-semibold";

type TabCache = {
  email?: EmailServiceSnapshot;
  storage?: { buckets: StorageBucketSnapshot[]; organizationId: string };
  api?: { snapshot: ApiManagementSnapshot; origin: string };
  backup?: BackupOperationsSnapshot;
  database?: DatabaseHealthSnapshot;
};

function seedCache(
  result: Extract<InfrastructureTabResult, { success: true }> | null,
): TabCache {
  if (!result) return {};
  switch (result.tab) {
    case "email":
      return { email: result.data };
    case "storage":
      return { storage: { buckets: result.data, organizationId: result.organizationId } };
    case "api":
      return { api: { snapshot: result.data, origin: result.origin } };
    case "backup":
      return { backup: result.data };
    case "database":
      return { database: result.data };
    default:
      return {};
  }
}

function applyResult(prev: TabCache, result: Extract<InfrastructureTabResult, { success: true }>): TabCache {
  switch (result.tab) {
    case "email":
      return { ...prev, email: result.data };
    case "storage":
      return {
        ...prev,
        storage: { buckets: result.data, organizationId: result.organizationId },
      };
    case "api":
      return { ...prev, api: { snapshot: result.data, origin: result.origin } };
    case "backup":
      return { ...prev, backup: result.data };
    case "database":
      return { ...prev, database: result.data };
    default:
      return prev;
  }
}

function InfrastructureTabSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 animate-pulse p-1">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 rounded-xl bg-muted/70" />
        ))}
      </div>
      <div className="min-h-[18rem] flex-1 rounded-xl bg-muted/50" />
    </div>
  );
}

type Props = {
  initialTab: InfrastructureTabId;
  initialApiSection?: ApiSectionId;
  initialResult: Extract<InfrastructureTabResult, { success: true }> | null;
  initialError?: string | null;
};

export function SystemIntegrationsHub({
  initialTab,
  initialApiSection = "overview",
  initialResult,
  initialError = null,
}: Props) {
  const [tab, setTab] = useState<InfrastructureTabId>(initialTab);
  const [apiSection] = useState<ApiSectionId>(initialApiSection);
  const [cache, setCache] = useState<TabCache>(() => seedCache(initialResult));
  const [loadingTab, setLoadingTab] = useState<InfrastructureTabId | null>(null);
  const [errorByTab, setErrorByTab] = useState<Partial<Record<InfrastructureTabId, string>>>(
    () => (initialError ? { [initialTab]: initialError } : {}),
  );
  const [, startTransition] = useTransition();
  const cacheRef = useRef<TabCache>(seedCache(initialResult));
  const inflight = useRef<Partial<Record<InfrastructureTabId, boolean>>>({});

  const ensureTabLoaded = useCallback((next: InfrastructureTabId) => {
    if (cacheRef.current[next] || inflight.current[next]) return;

    inflight.current[next] = true;
    setLoadingTab(next);
    setErrorByTab((prev) => {
      if (!prev[next]) return prev;
      const copy = { ...prev };
      delete copy[next];
      return copy;
    });

    startTransition(() => {
      void (async () => {
        try {
          const result = await loadInfrastructureTabAction(next);
          if (!result.success) {
            setErrorByTab((prev) => ({ ...prev, [next]: result.message }));
            toast.error(result.message);
            return;
          }
          setCache((prev) => {
            const nextCache = applyResult(prev, result);
            cacheRef.current = nextCache;
            return nextCache;
          });
        } catch (error) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Could not load this section. Please try again.";
          setErrorByTab((prev) => ({ ...prev, [next]: message }));
          toast.error(message);
        } finally {
          inflight.current[next] = false;
          setLoadingTab((current) => (current === next ? null : current));
        }
      })();
    });
  }, []);

  function selectTab(next: InfrastructureTabId) {
    setTab(next);
    ensureTabLoaded(next);
  }

  function retryTab() {
    delete inflight.current[tab];
    const nextCache = { ...cacheRef.current };
    delete nextCache[tab];
    cacheRef.current = nextCache;
    setCache(nextCache);
    ensureTabLoaded(tab);
  }

  const isLoading = Boolean(loadingTab === tab && !cache[tab]);
  const tabError = errorByTab[tab];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:gap-4 md:p-5">
      <div className="flex shrink-0 justify-center">
        <nav
          className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-xl border bg-card p-1.5 shadow-sm"
          aria-label="Infrastructure sections"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150",
                tab === item.id
                  ? ACTIVE_TAB_CLASS
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? <InfrastructureTabSkeleton /> : null}

        {!isLoading && tabError && !cache[tab] ? (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6 text-center shadow-sm">
            <p className="text-sm font-medium">Couldn’t load this section</p>
            <p className="max-w-md text-xs text-muted-foreground">{tabError}</p>
            <Button size="sm" onClick={retryTab}>
              Try again
            </Button>
          </div>
        ) : null}

        {!isLoading && !tabError && tab === "email" && cache.email ? (
          <EmailServicesPanel snapshot={cache.email} />
        ) : null}

        {!isLoading && tab === "storage" && cache.storage ? (
          <StorageManagerPanel
            buckets={cache.storage.buckets}
            organizationId={cache.storage.organizationId}
          />
        ) : null}

        {!isLoading && tab === "api" && cache.api ? (
          <ApiManagementHub
            snapshot={cache.api.snapshot}
            origin={cache.api.origin}
            initialSection={apiSection}
          />
        ) : null}

        {!isLoading && tab === "backup" && cache.backup ? (
          <BackupPanel initial={cache.backup} />
        ) : null}

        {!isLoading && tab === "database" && cache.database ? (
          <DatabaseHealthPanel initial={cache.database} />
        ) : null}
      </div>
    </div>
  );
}
