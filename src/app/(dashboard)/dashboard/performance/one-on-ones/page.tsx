import { OneOnOneForm, OneOnOneTable } from "@/components/performance/one-on-one-management";
import { createClient } from "@/lib/supabase/server";
import { canCreatePerformance } from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listOneOnOnes,
} from "@/lib/performance/services/performance-queries";
import { oneOnOneListParamsSchema } from "@/lib/validations/performance";
import { requireServerPermission } from "@/lib/permissions/server";

type OneOnOnesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OneOnOnesPage({ searchParams }: OneOnOnesPageProps) {
  const profile = await requireServerPermission("performance.view");
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = oneOnOneListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    employeeId: rawParams.employeeId,
    meetingStatus: rawParams.meetingStatus,
  });

  const [result, lookups] = await Promise.all([
    listOneOnOnes(supabase, profile, params),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">One-on-One Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule meetings with agenda, notes, action items, and follow-ups.
        </p>
      </div>
      {canCreatePerformance(profile.permissionCodes) ? (
        <OneOnOneForm employees={lookups.employees} />
      ) : null}
      <OneOnOneTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        employeeId={params.employeeId}
        meetingStatus={params.meetingStatus}
      />
    </div>
  );
}
