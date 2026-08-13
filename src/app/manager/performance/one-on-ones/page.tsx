import { OneOnOneForm, OneOnOneTable } from "@/components/performance/one-on-one-management";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import { listOneOnOnes } from "@/lib/performance/services/performance-queries";
import { oneOnOneListParamsSchema } from "@/lib/validations/performance";

type OneOnOnesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerOneOnOnesPage({ searchParams }: OneOnOnesPageProps) {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();
  const rawParams = await searchParams;

  const params = oneOnOneListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    employeeId: rawParams.employeeId,
    meetingStatus: rawParams.meetingStatus,
  });

  const result = await listOneOnOnes(supabase, profile, params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">One-on-One Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule meetings with agenda, meeting link, action items, and follow-ups.
        </p>
      </div>
      <OneOnOneForm employees={lookups.employees} />
      <OneOnOneTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        employeeId={params.employeeId}
        meetingStatus={params.meetingStatus}
        canEdit
        canDelete
      />
    </div>
  );
}
