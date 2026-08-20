import { MyProfileView } from "@/components/employee/profile/my-profile-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import {
  canEditSelfProfileContactDetails,
  canEditSelfReportingManager,
} from "@/lib/employee/profile-contact";
import { getMyProfileBundle } from "@/lib/employee/services/my-profile";
import { getEmployeeLookups } from "@/lib/employees/services/employee-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeProfilePage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  const data = await getMyProfileBundle(supabase, profile, EMPLOYEE_ROUTES.profile);

  if (!data) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Profile not found.
      </div>
    );
  }

  const canEditContactDetails = canEditSelfProfileContactDetails(profile.permissionCodes);
  const canEditReportingManager = canEditSelfReportingManager(profile.permissionCodes);
  const lookups = canEditReportingManager
    ? await getEmployeeLookups(
        supabase,
        profile.employee.organizationId,
        data.employeeId,
      )
    : null;

  const managerOptions = lookups?.managers.map((manager) => ({
    value: manager.id,
    label: manager.label,
  })) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <MyProfileView
        data={data}
        canEditContactDetails={canEditContactDetails}
        canEditReportingManager={canEditReportingManager}
        managerOptions={managerOptions}
      />
    </div>
  );
}
