import { MyProfileView } from "@/components/employee/profile/my-profile-view";
import { getExitSettings } from "@/lib/exit/services/exit-settings";
import { getEmployeeResignationSnapshot } from "@/lib/exit/services/exit-queries";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { canEditSelfProfileContactDetails } from "@/lib/employee/profile-contact";
import { getMyProfileBundle } from "@/lib/employee/services/my-profile";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeProfilePage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  const [data, resignationSnapshot, exitSettings] = await Promise.all([
    getMyProfileBundle(supabase, profile, EMPLOYEE_ROUTES.profile),
    getEmployeeResignationSnapshot(supabase, profile),
    getExitSettings(supabase, profile.employee.organizationId),
  ]);

  if (!data) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Profile not found.
      </div>
    );
  }

  const canEditContactDetails = canEditSelfProfileContactDetails(profile.permissionCodes);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <MyProfileView
        data={data}
        canEditContactDetails={canEditContactDetails}
        resignation={{
          canApply: hasPermission(profile.permissionCodes, "exit.create"),
          employeeId: profile.employee.id,
          defaultNoticePeriodDays: exitSettings.defaultNoticePeriodDays,
          activeResignation: resignationSnapshot.activeResignation,
          rejectedResignation:
            resignationSnapshot.history.find((row) => row.exitStatus === "rejected") ?? null,
        }}
      />
    </div>
  );
}
