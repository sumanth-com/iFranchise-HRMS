import { FeedbackForm, FeedbackTable } from "@/components/performance/feedback-management";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import { listFeedback } from "@/lib/performance/services/performance-queries";

export default async function ManagerFeedbackPage() {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();

  const result = await listFeedback(supabase, profile, {
    page: 1,
    pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Continuous Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Appreciation, suggestions, coaching, and warnings for your team.
        </p>
      </div>
      <FeedbackForm employees={lookups.employees} />
      <FeedbackTable
        records={result.data}
        pageSize={PERFORMANCE_TABLE_PAGE_SIZE}
        employees={lookups.employees}
        canDelete
      />
    </div>
  );
}
