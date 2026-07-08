import { ReviewForm, ReviewsTable } from "@/components/performance/reviews-management";
import { createClient } from "@/lib/supabase/server";
import {
  canApprovePerformance,
  canReviewPerformance,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listReviews,
} from "@/lib/performance/services/performance-queries";
import { reviewListParamsSchema } from "@/lib/validations/performance";
import { requireServerPermission } from "@/lib/permissions/server";

type ReviewsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = reviewListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    employeeId: rawParams.employeeId,
    departmentId: rawParams.departmentId,
    cycleId: rawParams.cycleId,
    reviewStatus: rawParams.reviewStatus,
    reviewStage: rawParams.reviewStage,
  });

  const [result, lookups] = await Promise.all([
    listReviews(supabase, profile, params),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Self, manager, HR, and final approval reviews with ratings and improvement plans.
        </p>
      </div>
      {canReviewPerformance(profile.permissionCodes) ? (
        <ReviewForm employees={lookups.employees} cycles={lookups.cycles} />
      ) : null}
      <ReviewsTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        departments={lookups.departments}
        cycles={lookups.cycles}
        employeeId={params.employeeId}
        departmentId={params.departmentId}
        cycleId={params.cycleId}
        reviewStatus={params.reviewStatus}
        canApprove={canApprovePerformance(profile.permissionCodes)}
      />
    </div>
  );
}
