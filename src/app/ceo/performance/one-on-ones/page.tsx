import { OneOnOneForm, OneOnOneTable } from "@/components/performance/one-on-one-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import {
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_TABLE_PAGE_SIZE,
} from "@/lib/performance/constants";
import {
  getPerformanceLookups,
  listOneOnOnes,
} from "@/lib/performance/services/performance-queries";
import { createClient } from "@/lib/supabase/server";

export default async function CeoOneOnOnesPage() {
  const profile = await requireCeoPortal();
  const supabase = await createClient();

  const [result, lookups] = await Promise.all([
    listOneOnOnes(supabase, profile, {
      page: 1,
      pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
    }),
    getPerformanceLookups(supabase, profile.employee.organizationId),
  ]);

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
