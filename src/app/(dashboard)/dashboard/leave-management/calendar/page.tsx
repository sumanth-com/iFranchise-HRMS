import { LeaveCalendarShell } from "@/components/leave/leave-calendar-shell";
import { createClient } from "@/lib/supabase/server";
import { getLeaveCalendarData } from "@/lib/leave/services/leave-queries";
import { requireServerPermission } from "@/lib/permissions/server";

type LeaveCalendarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeaveCalendarPage({
  searchParams,
}: LeaveCalendarPageProps) {
  const profile = await requireServerPermission("leave.view");
  const supabase = await createClient();
  const rawParams = await searchParams;
  const now = new Date();
  const month = rawParams.month ? Number(rawParams.month) : now.getMonth() + 1;
  const year = rawParams.year ? Number(rawParams.year) : now.getFullYear();

  const { leaves, holidays } = await getLeaveCalendarData(
    supabase,
    profile,
    month,
    year,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monthly view of approved and pending leaves, holidays, and weekends.
        </p>
      </div>
      <LeaveCalendarShell
        leaves={leaves}
        holidays={holidays}
        month={month}
        year={year}
      />
    </div>
  );
}
