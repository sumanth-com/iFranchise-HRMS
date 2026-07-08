import { PerformanceHistoryTimeline } from "@/components/performance/performance-history-timeline";
import { createClient } from "@/lib/supabase/server";
import {
  getPerformanceLookups,
  listPerformanceHistory,
} from "@/lib/performance/services/performance-queries";
import { historyListParamsSchema } from "@/lib/validations/performance";
import { requireServerPermission } from "@/lib/permissions/server";

type HistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PerformanceHistoryPage({ searchParams }: HistoryPageProps) {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = historyListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    employeeId: rawParams.employeeId,
    eventType: rawParams.eventType,
  });

  const [result, lookups] = await Promise.all([
    listPerformanceHistory(supabase, profile, params),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Timeline of reviews, promotions, salary revisions, feedback, and awards.
        </p>
      </div>
      <PerformanceHistoryTimeline
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        employeeId={params.employeeId}
        eventType={params.eventType}
      />
    </div>
  );
}
