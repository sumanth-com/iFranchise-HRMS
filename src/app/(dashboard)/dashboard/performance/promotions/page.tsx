import { PromotionForm, PromotionsTable } from "@/components/performance/promotion-management";
import { createClient } from "@/lib/supabase/server";
import {
  canApprovePerformance,
  canCreatePerformance,
  canEditPerformance,
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listPromotions,
} from "@/lib/performance/services/performance-queries";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function PromotionsPage() {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();

  const [result, lookups] = await Promise.all([
    listPromotions(supabase, profile, {
      page: 1,
      pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
    }),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Promotion Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Promotion and salary recommendations with multi-level approval workflow.
        </p>
      </div>
      {canCreatePerformance(profile.permissionCodes) ? (
        <PromotionForm
          employees={lookups.employees}
          designations={lookups.designations}
        />
      ) : null}
      <PromotionsTable
        records={result.data}
        pageSize={PERFORMANCE_TABLE_PAGE_SIZE}
        employees={lookups.employees}
        designations={lookups.designations}
        canApprove={canApprovePerformance(profile.permissionCodes)}
        canEdit={
          canCreatePerformance(profile.permissionCodes) ||
          canEditPerformance(profile.permissionCodes)
        }
        canDelete={
          canCreatePerformance(profile.permissionCodes) ||
          canEditPerformance(profile.permissionCodes)
        }
      />
    </div>
  );
}
