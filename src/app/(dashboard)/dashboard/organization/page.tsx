import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { OrganizationDashboardPanels } from "@/components/organization/organization-dashboard-panels";
import { OrganizationSearch } from "@/components/organization/organization-search";
import { OrganizationSummaryCards } from "@/components/organization/organization-summary-cards";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { getOrganizationDashboardStats } from "@/lib/organization/services/org-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

async function OrganizationDashboardContent() {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const stats = await getOrganizationDashboardStats(supabase, profile);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization Management</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Central hub for company profile, branches, departments, and master data.
        </p>
      </div>
      <OrganizationSummaryCards stats={stats} />
      <OrganizationDashboardPanels stats={stats} />
      <OrganizationSearch />
    </div>
  );
}

export default function OrganizationDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrganizationDashboardContent />
    </Suspense>
  );
}
