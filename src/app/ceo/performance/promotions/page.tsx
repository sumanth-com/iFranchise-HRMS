import { PromotionsTable } from "@/components/performance/promotion-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listPromotions,
} from "@/lib/performance/services/performance-queries";
import { createClient } from "@/lib/supabase/server";

export default async function CeoPromotionsPage() {
  const profile = await requireCeoPortal();
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
          Promotion and salary recommendations with approval workflow.
        </p>
      </div>
      <PromotionsTable
        records={result.data}
        pageSize={PERFORMANCE_TABLE_PAGE_SIZE}
        employees={lookups.employees}
        designations={lookups.designations}
        canApprove={false}
        canEdit={false}
        canDelete={false}
      />
    </div>
  );
}
