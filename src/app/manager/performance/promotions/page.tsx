import { PromotionForm, PromotionsTable } from "@/components/performance/promotion-management";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import { listPromotions } from "@/lib/performance/services/performance-queries";

export default async function ManagerPromotionsPage() {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();

  const result = await listPromotions(supabase, profile, {
    page: 1,
    pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Promotion Tracker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recommend promotions and salary changes for people on your team.
        </p>
      </div>
      <PromotionForm
        employees={lookups.employees}
        designations={lookups.designations}
      />
      <PromotionsTable
        records={result.data}
        pageSize={PERFORMANCE_TABLE_PAGE_SIZE}
        employees={lookups.employees}
        designations={lookups.designations}
        canApprove
        canEdit
        canDelete
      />
    </div>
  );
}
