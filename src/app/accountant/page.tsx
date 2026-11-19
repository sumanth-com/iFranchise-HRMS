import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { requireAccountantPortal } from "@/lib/accountant/permissions";

export default async function AccountantPortalPage() {
  const profile = await requireAccountantPortal();

  return (
    <EmployeeDashboardPageBody
      profile={profile}
      canManageAnnouncements={false}
      subtitle="Accountant Portal"
      pairHolidayBirthday
      showImportantNotices
    />
  );
}
