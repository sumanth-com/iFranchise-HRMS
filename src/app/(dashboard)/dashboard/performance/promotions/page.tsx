import { PromotionForm, PromotionsTable } from "@/components/performance/promotion-management";
import { createClient } from "@/lib/supabase/server";
import {
  canApprovePerformance,
  canCreatePerformance,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listPromotions,
} from "@/lib/performance/services/performance-queries";
import { promotionListParamsSchema } from "@/lib/validations/performance";
import { requireServerPermission } from "@/lib/permissions/server";

type PromotionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PromotionsPage({ searchParams }: PromotionsPageProps) {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = promotionListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    employeeId: rawParams.employeeId,
    promotionStatus: rawParams.promotionStatus,
  });

  const [result, lookups] = await Promise.all([
    listPromotions(supabase, profile, params),
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
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        employeeId={params.employeeId}
        promotionStatus={params.promotionStatus}
        canApprove={canApprovePerformance(profile.permissionCodes)}
      />
    </div>
  );
}
