import { FeedbackForm, FeedbackTable } from "@/components/performance/feedback-management";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import { listFeedback } from "@/lib/performance/services/performance-queries";
import { feedbackListParamsSchema } from "@/lib/validations/performance";

type FeedbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerFeedbackPage({ searchParams }: FeedbackPageProps) {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();
  const rawParams = await searchParams;

  const params = feedbackListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    employeeId: rawParams.employeeId,
    feedbackType: rawParams.feedbackType,
    visibility: rawParams.visibility,
  });

  const result = await listFeedback(supabase, profile, params);

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
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        employeeId={params.employeeId}
        feedbackType={params.feedbackType}
        canDelete
      />
    </div>
  );
}
