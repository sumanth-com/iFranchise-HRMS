import { Suspense } from "react";

import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";
import { SystemIntegrationsHub } from "@/components/system-admin/system-integrations-hub";
import {
  loadInfrastructureTabAction,
} from "@/lib/system-admin/infrastructure-actions";
import type { InfrastructureTabId } from "@/lib/system-admin/infrastructure-types";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import type { ApiSectionId } from "@/components/system-admin/api-management-hub";

const TAB_IDS = new Set<InfrastructureTabId>([
  "email",
  "storage",
  "api",
  "backup",
  "database",
]);

const API_SECTION_IDS = new Set<ApiSectionId>([
  "overview",
  "keys",
  "docs",
  "usage",
  "webhooks",
  "settings",
]);

function parseTab(value: string | string[] | undefined): InfrastructureTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && TAB_IDS.has(raw as InfrastructureTabId)) {
    return raw as InfrastructureTabId;
  }
  return "email";
}

function parseApiSection(value: string | string[] | undefined): ApiSectionId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && API_SECTION_IDS.has(raw as ApiSectionId)) {
    return raw as ApiSectionId;
  }
  return "overview";
}

async function InfrastructureShell({
  tab,
  apiSection,
}: {
  tab: InfrastructureTabId;
  apiSection: ApiSectionId;
}) {
  await requireSuperAdminProfile();
  const initial = await loadInfrastructureTabAction(tab);

  return (
    <SystemIntegrationsHub
      initialTab={tab}
      initialApiSection={apiSection}
      initialResult={initial.success ? initial : null}
      initialError={initial.success ? null : initial.message}
    />
  );
}

export default async function SuperAdminIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const apiSection = parseApiSection(params.api);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<ModulePageSkeleton />}>
        <InfrastructureShell tab={tab} apiSection={apiSection} />
      </Suspense>
    </div>
  );
}
