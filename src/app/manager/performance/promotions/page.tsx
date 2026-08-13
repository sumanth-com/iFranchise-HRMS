import { PromotionForm, PromotionsTable } from "@/components/performance/promotion-management";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import { listPromotions } from "@/lib/performance/services/performance-queries";
import { promotionListParamsSchema } from "@/lib/validations/performance";

type PromotionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerPromotionsPage({ searchParams }: PromotionsPageProps) {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();
  const rawParams = await searchParams;

  const params = promotionListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    employeeId: rawParams.employeeId,
    promotionStatus: rawParams.promotionStatus,
  });

  const result = await listPromotions(supabase, profile, params);

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
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        designations={lookups.designations}
        employeeId={params.employeeId}
        promotionStatus={params.promotionStatus}
        canApprove
        canEdit
        canDelete
      />
    </div>
  );
}
