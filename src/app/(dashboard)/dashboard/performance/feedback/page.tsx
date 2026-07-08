import { FeedbackForm, FeedbackTable } from "@/components/performance/feedback-management";
import { createClient } from "@/lib/supabase/server";
import { canGiveFeedback } from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listFeedback,
} from "@/lib/performance/services/performance-queries";
import { feedbackListParamsSchema } from "@/lib/validations/performance";
import { requireServerPermission } from "@/lib/permissions/server";

type FeedbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = feedbackListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    employeeId: rawParams.employeeId,
    feedbackType: rawParams.feedbackType,
    visibility: rawParams.visibility,
  });

  const [result, lookups] = await Promise.all([
    listFeedback(supabase, profile, params),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Continuous Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Appreciation, suggestions, coaching, and warnings with public or private visibility.
        </p>
      </div>
      {canGiveFeedback(profile.permissionCodes) ? (
        <FeedbackForm employees={lookups.employees} />
      ) : null}
      <FeedbackTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        employeeId={params.employeeId}
        feedbackType={params.feedbackType}
      />
    </div>
  );
}
