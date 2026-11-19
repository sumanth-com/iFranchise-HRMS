import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SuperAdminPortalPage() {
  const profile = await requireSuperAdminProfile();

  return (
    <EmployeeDashboardPageBody
      profile={profile}
      subtitle="Super Admin Portal"
      pairHolidayBirthday
      showImportantNotices
      // Team Updates editing is CEO/HR only — Super Admin can view, not edit.
      canManageAnnouncements={false}
    />
  );
}
