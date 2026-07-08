import { notFound } from "next/navigation";

import { ReviewDetailView } from "@/components/performance/reviews-management";
import { createClient } from "@/lib/supabase/server";
import { getReviewById } from "@/lib/performance/services/performance-mutations";
import { requireServerPermission } from "@/lib/permissions/server";

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const { id } = await params;
  const review = await getReviewById(supabase, profile.employee.organizationId, id);

  if (!review) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review Detail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {review.cycleName ?? "Performance review"} — {review.employeeName}
        </p>
      </div>
      <ReviewDetailView review={review} />
    </div>
  );
}
