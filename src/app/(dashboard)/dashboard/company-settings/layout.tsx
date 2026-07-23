import { Suspense } from "react";

import { CompanySettingsNav } from "@/components/company-settings/company-settings-nav";
import { ModuleShell } from "@/components/common/sticky-layout";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function CompanySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireServerAnyPermission(["settings.view"]);

  return (
    <ModuleShell
      header={
        <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-muted" />}>
          <CompanySettingsNav />
        </Suspense>
      }
    >
      {children}
    </ModuleShell>
  );
}
