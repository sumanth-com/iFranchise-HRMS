import { SoftLoadError } from "@/components/common/soft-load-error";
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
    return <SoftLoadError variant="page" />;
  }
}
