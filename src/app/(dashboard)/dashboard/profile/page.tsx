import { MyProfileView } from "@/components/employee/profile/my-profile-view";
import { PageScroll } from "@/components/common/sticky-layout";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { canEditSelfProfileContactDetails } from "@/lib/employee/profile-contact";
import { SELF_PROFILE_ROUTES } from "@/lib/documents/constants";
import { getMyProfileBundle } from "@/lib/employee/services/my-profile";
import { getEmployeeLookups } from "@/lib/employees/services/employee-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardProfilePage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.hr,
    "employee_profile.view",
  ]);
  const supabase = await createClient();
  const data = await getMyProfileBundle(
    supabase,
    profile,
    SELF_PROFILE_ROUTES.profile,
  );

  if (!data) {
    return (
      <PageScroll>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Profile not found.
        </div>
      </PageScroll>
    );
  }

  const canEditContactDetails = canEditSelfProfileContactDetails(profile.permissionCodes);
  const lookups = canEditContactDetails
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
    <PageScroll>
      <MyProfileView
        data={data}
        canEditContactDetails={canEditContactDetails}
        managerOptions={managerOptions}
      />
    </PageScroll>
  );
}
