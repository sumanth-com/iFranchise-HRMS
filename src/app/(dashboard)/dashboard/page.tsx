import { EmployeeDashboardPageBody } from "@/components/employee/dashboard/employee-dashboard-page-body";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";

export default async function HrSelfServiceHomePage() {
  const profile = await requireAuthenticatedProfile();

  return (
    <EmployeeDashboardPageBody
      profile={profile}
      subtitle="HR Portal"
      pairHolidayBirthday
      showImportantNotices
    />
  );
}
