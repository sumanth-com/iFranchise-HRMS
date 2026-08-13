import { PromotionsTable } from "@/components/performance/promotion-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  getPerformanceLookups,
  listPromotions,
} from "@/lib/performance/services/performance-queries";
import { createClient } from "@/lib/supabase/server";
import { promotionListParamsSchema } from "@/lib/validations/performance";

type PromotionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CeoPromotionsPage({ searchParams }: PromotionsPageProps) {
  const profile = await requireCeoPortal();
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
          Promotion and salary recommendations with approval workflow.
        </p>
      </div>
      <PromotionsTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        designations={lookups.designations}
        employeeId={params.employeeId}
        promotionStatus={params.promotionStatus}
        canApprove={false}
        canEdit={false}
        canDelete={false}
      />
    </div>
  );
}
