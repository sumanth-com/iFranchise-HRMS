import { OneOnOneForm, OneOnOneTable } from "@/components/performance/one-on-one-management";
import { loadManagerPerformancePage } from "@/lib/manager/load-admin-context";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import { listOneOnOnes } from "@/lib/performance/services/performance-queries";

export default async function ManagerOneOnOnesPage() {
  const { profile, supabase, lookups } = await loadManagerPerformancePage();

  const result = await listOneOnOnes(supabase, profile, {
    page: 1,
    pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">One-on-One Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule meetings with agenda, meeting link, and action items.
        </p>
      </div>
      <OneOnOneForm employees={lookups.employees} />
      <OneOnOneTable
        records={result.data}
        pageSize={PERFORMANCE_TABLE_PAGE_SIZE}
        employees={lookups.employees}
        canEdit
        canDelete
      />
    </div>
  );
}
