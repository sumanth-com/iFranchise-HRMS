import { ErrorState } from "@/components/common/error-state";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { getEmployeeDashboardData } from "@/lib/employee/services/employee-dashboard-queries";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/auth";

/**
 * Soft-fails dashboard data load so a secondary query failure cannot replace
 * the whole portal with the route-level error boundary.
 */
export async function EmployeeDashboardPageBody({
  profile,
  subtitle,
  canManageAnnouncements = false,
  pairHolidayBirthday = false,
  showImportantNotices = false,
}: {
  profile: UserProfile;
  subtitle: string;
  canManageAnnouncements?: boolean;
  pairHolidayBirthday?: boolean;
  showImportantNotices?: boolean;
}) {
  try {
    const supabase = await createClient();
    const data = await getEmployeeDashboardData(supabase, profile);
    return (
      <EmployeeDashboardView
        {...data}
        canManageAnnouncements={canManageAnnouncements}
        subtitle={subtitle}
        pairHolidayBirthday={pairHolidayBirthday}
        showImportantNotices={showImportantNotices}
      />
    );
  } catch (error) {
    console.error("[employee-dashboard] page load failed", error);
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <ErrorState
          title="Dashboard unavailable"
          description={
            error instanceof Error
              ? error.message
              : "We couldn't load this dashboard right now. Try another module or refresh."
          }
        />
      </div>
    );
  }
}
