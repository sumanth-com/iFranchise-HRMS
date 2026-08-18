import { FeedbackForm, FeedbackTable } from "@/components/performance/feedback-management";
import { createClient } from "@/lib/supabase/server";
import {
  canGiveFeedback,
  canEditPerformance,
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listFeedback,
} from "@/lib/performance/services/performance-queries";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function FeedbackPage() {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();

  const [result, lookups] = await Promise.all([
    listFeedback(supabase, profile, {
      page: 1,
      pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
    }),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Continuous Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Appreciation, suggestions, coaching, and warnings — visible only in the employee&apos;s profile.
        </p>
      </div>
      {canGiveFeedback(profile.permissionCodes) ? (
        <FeedbackForm employees={lookups.employees} />
      ) : null}
      <FeedbackTable
        records={result.data}
        pageSize={PERFORMANCE_TABLE_PAGE_SIZE}
        employees={lookups.employees}
        canDelete={
          canGiveFeedback(profile.permissionCodes) ||
          canEditPerformance(profile.permissionCodes)
        }
      />
    </div>
  );
}
